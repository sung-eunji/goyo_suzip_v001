// Supabase 데이터 접근 계층 — 인증 + 프로필 + 저널(설정/기록) + 관리자
import { supabase, setRemember } from '../supabaseClient';
import { BODY, MET_FEEL, iso } from './data';

const RESPONSE_KEYS = {
  '숨이 트였다': 'deep_breath',
  '어깨가 내려갔다': 'shoulder_down',
  '속이 따뜻해졌다': 'warm_belly',
  '머리가 조용해졌다': 'slow_thought',
  '시간이 느려졌다': 'wide_view',
  '잘 모르겠다': 'no_change',
};
const RESPONSE_LABELS = Object.fromEntries(
  Object.entries(RESPONSE_KEYS).map(([label, key]) => [key, label]),
);
const writeQueues = new Map();

async function serializeWrite(key, operation) {
  const previous = writeQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  writeQueues.set(key, current);
  try {
    return await current;
  } finally {
    if (writeQueues.get(key) === current) writeQueues.delete(key);
  }
}

export function nicknameKey(nickname) {
  return nickname.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ');
}

export async function isNicknameAvailable(nickname) {
  const { data, error } = await supabase.rpc('is_nickname_available', {
    p_nickname: nickname.trim(),
  });
  if (error) throw error;
  return data === true;
}

/* ---------------- 인증 ---------------- */

// 가입 없이 시작 (익명 로그인) + 프로필 생성
export async function startAnon(nickname, remember = true) {
  setRemember(remember);
  if (!(await isNicknameAvailable(nickname))) {
    const error = new Error(
      '이미 사용 중인 닉네임이에요. 기존 계정으로 로그인해주세요.',
    );
    error.code = 'NICKNAME_TAKEN';
    throw error;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  try {
    await ensureProfile(nickname);
  } catch (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }
  return data.user;
}

export async function registerAccount({
  email,
  password,
  nickname,
  gender,
  remember = true,
}) {
  setRemember(remember);
  const cleanNickname = nickname.trim();
  if (!(await isNicknameAvailable(cleanNickname))) {
    const error = new Error(
      '이미 사용 중인 닉네임이에요. 다른 닉네임을 선택해주세요.',
    );
    error.code = 'NICKNAME_TAKEN';
    throw error;
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { nickname: cleanNickname, gender },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function login(email, password, remember = true) {
  setRemember(remember);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function sendPasswordReset(email, redirectTo) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  );
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// 익명 계정 → 정식 계정 전환 (같은 user id 유지 → 기록 보존)
export async function convertToAccount(email, password) {
  const { error } = await supabase.auth.updateUser({ email, password });
  if (error) throw error;
  const { data: u } = await supabase.auth.getUser();
  if (u?.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_anonymous: false, converted_at: new Date().toISOString() })
      .eq('id', u.user.id);
    if (profileError) throw profileError;
  }
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_e, session) =>
    cb(session?.user || null),
  );
}

/* ---------------- 프로필 ---------------- */

export async function ensureProfile(nickname) {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) return null;
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      nickname: nickname || '고요님',
      nickname_key: nicknameKey(nickname || '고요님'),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', u.user.id)
    .maybeSingle();
  return data;
}

export async function updateNickname(nickname) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;
  await supabase.from('profiles').update({ nickname }).eq('id', u.user.id);
}

/* ---------------- 저널: 설정(약속·예보) + 기록 ---------------- */

export async function fetchJournal(userId) {
  const [
    { data: settings },
    { data: promises },
    { data: forecastEventRows },
    { data: forecastLevelRows },
    { data: eventTypes },
    { data: entries },
    { data: surveys },
  ] = await Promise.all([
    supabase
      .from('settings')
      .select('theme,prefs')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('promises')
      .select('id,month,text_raw,position,is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('position'),
    supabase
      .from('forecast_day_events')
      .select('date,event_type,event_note')
      .eq('user_id', userId),
    supabase
      .from('forecasts')
      .select('date,level')
      .eq('user_id', userId),
    supabase
      .from('forecast_event_types')
      .select('key,label_ko,weight,sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('entries').select('*').eq('user_id', userId),
    supabase
      .from('survey_responses')
      .select('survey_key,answers')
      .eq('user_id', userId)
      .like('survey_key', 'daily:%'),
  ]);
  const forecastEvents = {};
  const forecastEventNotes = {};
  (forecastEventRows || []).forEach((r) => {
    (forecastEvents[r.date] ||= []).push(r.event_type);
    if (r.event_note) (forecastEventNotes[r.date] ||= {})[r.event_type] = r.event_note;
  });
  const forecastLevels = Object.fromEntries(
    (forecastLevelRows || []).map((r) => [r.date, r.level]),
  );
  const forecast = Object.fromEntries(
    Object.entries(forecastLevels).map(([date, level]) => [date, level * 25]),
  );
  const map = {};
  const entryIds = (entries || []).map((e) => e.id);
  const [{ data: checks }, { data: sensations }, { data: encounters }] =
    await Promise.all([
      entryIds.length
        ? supabase
            .from('entry_promise_checks')
            .select('entry_id,promise_id,done')
            .in('entry_id', entryIds)
        : { data: [] },
      entryIds.length
        ? supabase
            .from('entry_sensations')
            .select('entry_id,category,option_key,text_raw')
            .in('entry_id', entryIds)
        : { data: [] },
      entryIds.length
        ? supabase
            .from('encounters')
            .select('id,entry_id,text_raw,minutes')
            .in('entry_id', entryIds)
            .order('position')
        : { data: [] },
    ]);
  const encounterIds = (encounters || []).map((encounter) => encounter.id);
  const { data: responses } = encounterIds.length
    ? await supabase
        .from('encounter_responses')
        .select('encounter_id,response_key')
        .in('encounter_id', encounterIds)
    : { data: [] };
  const promiseById = Object.fromEntries(
    (promises || []).map((p) => [p.id, p]),
  );
  const checksByEntry = {};
  (checks || []).forEach((c) => {
    (checksByEntry[c.entry_id] ||= []).push(c);
  });
  const sensationsByEntry = {};
  (sensations || []).forEach((s) => {
    (sensationsByEntry[s.entry_id] ||= []).push(s);
  });
  const encountersByEntry = {};
  (encounters || []).forEach((e) => {
    (encountersByEntry[e.entry_id] ||= []).push(e);
  });
  const responseByEncounter = {};
  (responses || []).forEach((r) => {
    (responseByEncounter[r.encounter_id] ||= []).push(r.response_key);
  });
  const surveyByDate = Object.fromEntries(
    (surveys || []).map((s) => [s.survey_key.slice(6), s.answers || {}]),
  );
  (entries || []).forEach((e) => {
    const month = `${e.local_date.slice(0, 7)}-01`;
    const monthPromises = (promises || []).filter((p) => p.month === month);
    const entryChecks = checksByEntry[e.id] || [];
    const entrySensations = sensationsByEntry[e.id] || [];
    const entryEncounters = encountersByEntry[e.id] || [];
    const found = entryEncounters[0];
    map[e.local_date] = {
      surge: e.surge,
      dayNote: e.day_note || '',
      kept: entryChecks
        .map((c) => monthPromises.findIndex((p) => p.id === c.promise_id))
        .filter((i) => i >= 0),
      met: found
        ? {
            moment: found.text_raw,
            min: found.minutes || 0,
            feel: (responseByEncounter[found.id] || []).map(
              (key) => RESPONSE_LABELS[key] || key,
            ),
          }
        : null,
      body: entrySensations
        .map((s) => s.text_raw || s.option_key)
        .filter(Boolean),
      none: !!e.no_stillness,
      observation: surveyByDate[e.local_date] || {
        needs: [],
        desiredCalm: '',
        solutionScore: null,
      },
    };
  });
  return {
    promises: (promises || [])
      .filter((p) => p.month === `${new Date().toISOString().slice(0, 7)}-01`)
      .map((p) => p.text_raw),
    forecast,
    forecastLevels,
    forecastEvents,
    forecastEventNotes,
    eventTypes: eventTypes || [],
    entries: map,
  };
}

export async function savePromises(userId, promises, targetMonth = `${new Date().toISOString().slice(0, 7)}-01`) {
  const month = targetMonth;
  return serializeWrite(`promises:${userId}:${month}`, async () => {
    const { data: current, error: readError } = await supabase
      .from('promises')
      .select('text_raw,position')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('is_active', true)
      .order('position');
    if (readError) throw readError;
    const unchanged = (current || []).map((item) => item.text_raw).join('\n') === promises.join('\n');
    if (unchanged) return;

    const { error: deactivateError } = await supabase
      .from('promises')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('month', month)
      .eq('is_active', true);
    if (deactivateError) throw deactivateError;
    if (promises.length) {
      const { error } = await supabase.from('promises').insert(
        promises.map((text, index) => ({ user_id: userId, month, text_raw: text, position: index + 1 })),
      );
      if (error) throw error;
    }
  });
}

export async function saveForecastCalendar(
  userId,
  forecastEvents,
  forecastLevels = {},
  forecastEventNotes = {},
  targetMonth = `${new Date().toISOString().slice(0, 7)}-01`,
) {
  const month = targetMonth;
  const nextMonth = new Date(`${month}T00:00:00`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const endDate = iso(nextMonth);

  return serializeWrite(`forecast:${userId}:${month}`, async () => {
    const [existingEventsResult, existingLevelsResult] = await Promise.all([
      supabase.from('forecast_day_events').select('date,event_type').eq('user_id', userId).gte('date', month).lt('date', endDate),
      supabase.from('forecasts').select('date').eq('user_id', userId).gte('date', month).lt('date', endDate),
    ]);
    if (existingEventsResult.error) throw existingEventsResult.error;
    if (existingLevelsResult.error) throw existingLevelsResult.error;

    const desiredEvents = Object.entries(forecastEvents)
      .filter(([date]) => date >= month && date < endDate)
      .flatMap(([date, types]) => (types || []).map((eventType) => ({
        user_id: userId,
        date,
        event_type: eventType,
        event_note: eventType === 'other' ? forecastEventNotes[date]?.other?.trim() || null : null,
      })));
    const desiredEventKeys = new Set(desiredEvents.map((row) => `${row.date}:${row.event_type}`));
    const removedEvents = (existingEventsResult.data || []).filter((row) => !desiredEventKeys.has(`${row.date}:${row.event_type}`));

    if (desiredEvents.length) {
      const { error } = await supabase.from('forecast_day_events').upsert(desiredEvents, { onConflict: 'user_id,date,event_type' });
      if (error) throw error;
    }
    for (const row of removedEvents) {
      const { error } = await supabase.from('forecast_day_events').delete()
        .eq('user_id', userId).eq('date', row.date).eq('event_type', row.event_type);
      if (error) throw error;
    }

    const desiredLevels = Object.entries(forecastLevels)
      .filter(([date]) => date >= month && date < endDate)
      .map(([date, level]) => ({ user_id: userId, date, level: Math.max(0, Math.min(4, Number(level) || 0)) }));
    const desiredDates = new Set(desiredLevels.map((row) => row.date));
    const removedLevels = (existingLevelsResult.data || []).filter((row) => !desiredDates.has(row.date));
    if (desiredLevels.length) {
      const { error } = await supabase.from('forecasts').upsert(desiredLevels, { onConflict: 'user_id,date' });
      if (error) throw error;
    }
    if (removedLevels.length) {
      const { error } = await supabase.from('forecasts').delete()
        .eq('user_id', userId).in('date', removedLevels.map((row) => row.date));
      if (error) throw error;
    }
  });
}

export async function saveSettings(userId, promises, forecastEvents, forecastLevels = {}, forecastEventNotes = {}) {
  await Promise.all([
    savePromises(userId, promises),
    saveForecastCalendar(userId, forecastEvents, forecastLevels, forecastEventNotes),
  ]);
}

export async function saveEntry(userId, date, e) {
  const { data: entry, error } = await supabase
    .from('entries')
    .upsert({
      user_id: userId,
      local_date: date,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      surge: e.surge,
      day_note: e.dayNote?.trim() || null,
      no_stillness: !!e.none,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  const childDeletes = await Promise.all([
    supabase.from('entry_promise_checks').delete().eq('entry_id', entry.id),
    supabase.from('entry_sensations').delete().eq('entry_id', entry.id),
    supabase.from('encounters').delete().eq('entry_id', entry.id),
  ]);
  const deleteError = childDeletes.find((result) => result.error)?.error;
  if (deleteError) throw deleteError;
  const month = `${date.slice(0, 7)}-01`;
  const { data: promises } = await supabase
    .from('promises')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('is_active', true)
    .order('position');
  if (e.kept?.length && promises?.length) {
    const { error: checkError } = await supabase.from('entry_promise_checks').insert(
      e.kept
        .map((i) => promises[i])
        .filter(Boolean)
        .map((p) => ({
          entry_id: entry.id,
          user_id: userId,
          promise_id: p.id,
          done: true,
        })),
    );
      if (checkError) throw checkError;
    }
  const sensationRows = Object.entries(BODY).flatMap(([category, group]) =>
    (e.body || [])
      .filter((text) => group.items.includes(text))
      .map((text) => ({
        entry_id: entry.id,
        user_id: userId,
        category:
          category === 'tense'
            ? 'tight'
            : category === 'ease'
              ? 'release'
              : category,
        text_raw: text,
      })),
  );
  if (sensationRows.length) {
    const { error: sensationError } = await supabase.from('entry_sensations').insert(sensationRows);
    if (sensationError) throw sensationError;
  }
  if (e.met) {
    const { data: encounter, error: encounterError } = await supabase
      .from('encounters')
      .insert({
        entry_id: entry.id,
        user_id: userId,
        text_raw: e.met.moment || '기록된 고요',
        minutes: e.met.min || 0,
      })
      .select('id')
      .single();
    if (encounterError) throw encounterError;
    const responses = (e.met.feel || [])
      .filter((feel) => RESPONSE_KEYS[feel])
      .map((feel) => ({
        encounter_id: encounter.id,
        user_id: userId,
        response_key: RESPONSE_KEYS[feel],
      }));
    if (responses.length) {
      const { error: responseError } = await supabase.from('encounter_responses').insert(responses);
      if (responseError) throw responseError;
    }
  }
  const observation = e.observation || {};
  const { error: surveyError } = await supabase.from('survey_responses').upsert(
    {
      user_id: userId,
      survey_key: `daily:${date}`,
      answers: {
        needs: observation.needs || [],
        desiredCalm: observation.desiredCalm || '',
        solutionScore: observation.solutionScore || null,
      },
    },
    { onConflict: 'user_id,survey_key' },
  );
  if (surveyError) throw surveyError;
}

export async function deleteEntry(userId, date) {
  const { error: entryError } = await supabase
    .from('entries')
    .delete()
    .eq('user_id', userId)
    .eq('local_date', date);
  if (entryError) throw entryError;
  const { error: surveyError } = await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', userId)
    .eq('survey_key', `daily:${date}`);
  if (surveyError) throw surveyError;
}

// 데모 시드를 통째로 저장 (설정 + 여러 기록)
export async function saveWholeJournal(userId, S) {
  await saveSettings(userId, S.promises, S.forecastEvents);
  await Promise.all(
    Object.entries(S.entries).map(([date, entry]) =>
      saveEntry(userId, date, entry),
    ),
  );
}

export async function clearMyEntries(userId) {
  await supabase.from('entries').delete().eq('user_id', userId);
  await supabase.from('forecast_day_events').delete().eq('user_id', userId);
  await supabase.from('promises').delete().eq('user_id', userId);
  await supabase.from('survey_responses').delete().eq('user_id', userId);
  await saveSettings(userId, [], {});
}

/* ---------------- 관리자 (Gee가 참가자 전체 열람) ---------------- */

export async function adminOverview() {
  // RLS가 관리자에게 전체 select를 허용
  const [{ data: profiles }, { data: entries }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,nickname,created_at,subscribed,role')
      .order('created_at'),
    supabase
      .from('v_day')
      .select(
        'user_id,local_date,surge,no_stillness,kept_count,encounter_minutes',
      ),
  ]);
  const byUser = {};
  (entries || []).forEach((e) => {
    const u = (byUser[e.user_id] = byUser[e.user_id] || {
      count: 0,
      none: 0,
      surgeSum: 0,
      kept: 0,
      met: 0,
      last: '',
    });
    u.count++;
    if (e.no_stillness) u.none++;
    u.surgeSum += e.surge || 0;
    u.kept += e.kept_count || 0;
    u.met += e.encounter_minutes || 0;
    if (e.local_date > u.last) u.last = e.local_date;
  });
  return (profiles || []).map((p) => {
    const s = byUser[p.id] || {
      count: 0,
      none: 0,
      surgeSum: 0,
      kept: 0,
      met: 0,
      last: '',
    };
    return {
      id: p.id,
      nickname: p.nickname,
      subscribed: p.subscribed,
      joined: (p.created_at || '').slice(0, 10),
      days: s.count,
      noneDays: s.none,
      avgSurge: s.count ? Math.round(s.surgeSum / s.count) : 0,
      keptTotal: s.kept,
      metMin: s.met,
      lastEntry: s.last || '—',
    };
  });
}

export async function adminResearchDataset() {
  const queries = await Promise.all([
    supabase.from('profiles')
      .select('id,nickname,gender,cohort,role,subscribed,is_anonymous,converted_at,research_consent,research_consent_at,created_at,analysis_id')
      .order('created_at'),
    supabase.from('entries')
      .select('id,user_id,local_date,tz,surge,no_stillness,day_note,created_at,updated_at')
      .order('local_date', { ascending: false }),
    supabase.from('promises')
      .select('id,user_id,month,text_raw,vessel_key,target_minutes,position,is_active,created_at')
      .order('month', { ascending: false }),
    supabase.from('entry_promise_checks')
      .select('entry_id,user_id,promise_id,done,minutes'),
    supabase.from('entry_sensations')
      .select('id,entry_id,user_id,category,option_key,text_raw'),
    supabase.from('encounters')
      .select('id,entry_id,user_id,text_raw,minutes,vessel_key,position,created_at')
      .order('created_at', { ascending: false }),
    supabase.from('encounter_responses')
      .select('encounter_id,user_id,response_key'),
    supabase.from('survey_responses')
      .select('user_id,survey_key,answers,created_at')
      .order('created_at', { ascending: false }),
    supabase.from('v_forecast_score').select('user_id,date,score'),
    supabase.from('forecast_day_events').select('user_id,date,event_type,event_note'),
    supabase.from('forecast_event_types').select('key,label_ko'),
  ]);
  const [profiles, entries, promises, checks, sensations, encounters, responses, surveys, forecastScores, forecastEvents, forecastTypes] = queries.map((result) => {
    if (result.error) throw result.error;
    return result.data || [];
  });

  const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  const checksByEntry = {};
  checks.forEach((check) => { (checksByEntry[check.entry_id] ||= []).push(check); });
  const sensationsByEntry = {};
  sensations.forEach((sensation) => { (sensationsByEntry[sensation.entry_id] ||= []).push(sensation); });
  const encountersByEntry = {};
  encounters.forEach((encounter) => { (encountersByEntry[encounter.entry_id] ||= []).push(encounter); });
  const responsesByEncounter = {};
  responses.forEach((response) => { (responsesByEncounter[response.encounter_id] ||= []).push(RESPONSE_LABELS[response.response_key] || response.response_key); });
  const surveysByKey = {};
  surveys.forEach((survey) => { surveysByKey[`${survey.user_id}:${survey.survey_key}`] = survey; });
  const promisesByUser = {};
  promises.forEach((promise) => { (promisesByUser[promise.user_id] ||= []).push(promise); });
  const forecastByDay = Object.fromEntries(forecastScores.map((row) => [`${row.user_id}:${row.date}`, row.score]));
  const forecastLabels = Object.fromEntries(forecastTypes.map((row) => [row.key, row.label_ko]));
  const eventsByDay = {};
  forecastEvents.forEach((row) => {
    (eventsByDay[`${row.user_id}:${row.date}`] ||= []).push({
      label: forecastLabels[row.event_type] || row.event_type,
      note: row.event_note || '',
    });
  });

  const detailedEntries = entries.map((entry) => {
    const monthlyPromises = (promisesByUser[entry.user_id] || []).filter((promise) => promise.month === `${entry.local_date.slice(0, 7)}-01`);
    const entryChecks = checksByEntry[entry.id] || [];
    const entryEncounters = (encountersByEntry[entry.id] || []).map((encounter) => ({
      ...encounter,
      responses: responsesByEncounter[encounter.id] || [],
    }));
    return {
      ...entry,
      nickname: profileById[entry.user_id]?.nickname || '알 수 없음',
      forecastScore: forecastByDay[`${entry.user_id}:${entry.local_date}`] ?? null,
      forecastEvents: eventsByDay[`${entry.user_id}:${entry.local_date}`] || [],
      sensations: sensationsByEntry[entry.id] || [],
      encounters: entryEncounters,
      promises: monthlyPromises.map((promise) => ({
        ...promise,
        done: entryChecks.some((check) => check.promise_id === promise.id && check.done),
      })),
      observation: surveysByKey[`${entry.user_id}:daily:${entry.local_date}`]?.answers || null,
    };
  });

  return { profiles, entries: detailedEntries, promises, surveys };
}

export async function adminAllEntries() {
  const { data } = await supabase.from('v_day').select('*');
  return data || [];
}
