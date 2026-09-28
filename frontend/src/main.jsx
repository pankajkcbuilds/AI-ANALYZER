import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Brain,
  Camera,
  CheckCircle2,
  FileText,
  Gauge,
  History,
  LogOut,
  Mic,
  Play,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Square,
  Upload,
  User,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const sampleProfile = {
  name: 'Demo Candidate',
  email: 'student@example.com',
  education: 'B.Tech Computer Science',
  skills: ['Java', 'OOP', 'SQL', 'Spring Boot'],
  experience: 'Fresher',
  target_role: 'Java Developer',
  resume_text: 'Java, Spring Boot, REST API, MySQL, project management system',
};

const fallbackQuestion = {
  id: 'q-1',
  text: 'Explain OOP concepts for a Java Developer interview clearly, and include one real project example.',
  focus_area: 'Java',
};

function App() {
  const [route, setRoute] = useState('dashboard');
  const [profile, setProfile] = useState(sampleProfile);
  const [setup, setSetup] = useState({
    job_role: 'Java Developer',
    experience_level: 'Fresher',
    interview_type: 'Technical + HR',
    difficulty: 'Medium',
    question_count: 5,
    duration_minutes: 30,
    skills: sampleProfile.skills,
    resume_text: sampleProfile.resume_text,
  });
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(fallbackQuestion);
  const [analyses, setAnalyses] = useState([]);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [fairness, setFairness] = useState(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  useEffect(() => {
    loadDashboard();
    loadHistory();
    loadFairness();
  }, []);

  async function api(path, options) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async function loadDashboard() {
    try {
      setDashboard(await api('/dashboard'));
    } catch {
      setDashboard({
        total_interviews: 4,
        average_score: 82,
        best_score: 88,
        trends: [
          { label: 'Session 1', communication: 72, confidence: 68, domain: 76, non_verbal: 70 },
          { label: 'Session 2', communication: 78, confidence: 74, domain: 80, non_verbal: 75 },
          { label: 'Session 3', communication: 82, confidence: 79, domain: 86, non_verbal: 81 },
          { label: 'Session 4', communication: 86, confidence: 83, domain: 88, non_verbal: 84 },
        ],
      });
    }
  }

  async function loadHistory() {
    try {
      setHistory(await api('/interviews'));
    } catch {
      setHistory([
        { id: 'demo-1', date: '2026-08-11', job_role: 'Java Developer', interview_type: 'Technical', overall_score: 68, communication: 70, confidence: 62, domain_knowledge: 74, non_verbal: 66 },
        { id: 'demo-5', date: '2026-08-27', job_role: 'Java Developer', interview_type: 'Mixed', overall_score: 84, communication: 86, confidence: 80, domain_knowledge: 88, non_verbal: 82 },
      ]);
    }
  }

  async function loadFairness() {
    try {
      setFairness(await api('/admin/fairness'));
    } catch {
      setFairness({
        groups: [
          { group: 'Opt-in Group A', average_score: 81, sample_size: 42 },
          { group: 'Opt-in Group B', average_score: 78, sample_size: 39 },
          { group: 'Opt-in Group C', average_score: 80, sample_size: 31 },
        ],
        prediction_disparity: 3,
        demographic_parity_gap: 0.04,
        equalized_odds_gap: 0.06,
        feature_leakage_risk: 'Low',
      });
    }
  }

  async function startInterview() {
    const payload = { candidate_email: profile.email, setup };
    try {
      const data = await api('/interviews/start', { method: 'POST', body: JSON.stringify(payload) });
      setInterview({ id: data.interview_id, startedAt: Date.now() });
      setCurrentQuestion(data.question);
    } catch {
      setInterview({ id: `demo-${Date.now()}`, startedAt: Date.now() });
      setCurrentQuestion(fallbackQuestion);
    }
    setAnalyses([]);
    setReport(null);
    setRoute('interview');
  }

  async function submitAnswer(transcript, duration) {
    const payload = {
      interview_id: interview?.id || 'demo',
      question_id: currentQuestion.id,
      question: currentQuestion.text,
      transcript,
      duration_seconds: duration,
    };
    let analysis;
    try {
      analysis = await api('/interviews/answer', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      analysis = mockAnalysis(payload);
    }
    const updatedAnalyses = [...analyses, analysis];
    setAnalyses(updatedAnalyses);

    if (updatedAnalyses.length >= setup.question_count) {
      await finishInterview(updatedAnalyses);
      return;
    }

    setCurrentQuestion(analysis.next_question || {
      id: `q-${updatedAnalyses.length + 1}`,
      text: 'Can you connect that answer to one measurable result from a project?',
      focus_area: 'follow-up',
    });
  }

  async function finishInterview(answerList = analyses) {
    if (interview?.id && !interview.id.startsWith('demo')) {
      try {
        setReport(await api(`/interviews/${interview.id}/report`));
      } catch {
        setReport(mockReport(interview.id, answerList));
      }
    } else {
      setReport(mockReport(interview?.id || 'demo', answerList));
    }
    setRoute('report');
    loadDashboard();
    loadHistory();
  }

  const nav = [
    ['dashboard', BarChart3, 'Dashboard'],
    ['setup', Brain, 'Interview Setup'],
    ['interview', Camera, 'Live Interview'],
    ['report', FileText, 'Report'],
    ['history', History, 'History'],
    ['admin', ShieldCheck, 'Admin'],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Sparkles size={21} /></span>
          <div>
            <strong>AI Interview</strong>
            <span>Performance Analyzer</span>
          </div>
        </div>
        <nav>
          {nav.map(([key, Icon, label]) => (
            <button key={key} className={route === key ? 'active' : ''} onClick={() => setRoute(key)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} mode</button>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Production-style starter</p>
            <h1>{pageTitle(route)}</h1>
          </div>
          <div className="profile-chip"><User size={17} /> {profile.name}<LogOut size={17} /></div>
        </header>

        {route === 'dashboard' && <Dashboard data={dashboard} />}
        {route === 'setup' && <Setup profile={profile} setProfile={setProfile} setup={setup} setSetup={setSetup} startInterview={startInterview} />}
        {route === 'interview' && <InterviewScreen question={currentQuestion} index={analyses.length + 1} total={setup.question_count} onSubmit={submitAnswer} onFinish={finishInterview} disabled={!interview} />}
        {route === 'report' && <Report report={report || mockReport(interview?.id || 'demo', analyses)} />}
        {route === 'history' && <HistoryView rows={history} />}
        {route === 'admin' && <AdminView fairness={fairness} />}
      </main>
    </div>
  );
}

function Dashboard({ data }) {
  if (!data) return <Panel>Loading analytics...</Panel>;
  const categoryData = data.trends.at(-1)
    ? [
        { name: 'Communication', value: data.trends.at(-1).communication },
        { name: 'Confidence', value: data.trends.at(-1).confidence },
        { name: 'Domain', value: data.trends.at(-1).domain },
        { name: 'Non-verbal', value: data.trends.at(-1).non_verbal },
      ]
    : [];
  return (
    <section className="stack">
      <div className="kpi-grid">
        <Kpi icon={History} label="Total interviews" value={data.total_interviews} />
        <Kpi icon={Gauge} label="Average score" value={`${data.average_score}/100`} />
        <Kpi icon={CheckCircle2} label="Best score" value={`${data.best_score}/100`} />
      </div>
      <div className="two-column">
        <Panel title="Performance Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="communication" stroke="#2563eb" fill="#bfdbfe" />
              <Area type="monotone" dataKey="confidence" stroke="#16a34a" fill="#bbf7d0" />
              <Area type="monotone" dataKey="domain" stroke="#ea580c" fill="#fed7aa" />
              <Area type="monotone" dataKey="non_verbal" stroke="#7c3aed" fill="#ddd6fe" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Latest Category Scores">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={['#2563eb', '#16a34a', '#ea580c', '#7c3aed'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </section>
  );
}

function Setup({ profile, setProfile, setup, setSetup, startInterview }) {
  return (
    <section className="setup-grid">
      <Panel title="Candidate Profile">
        <Input label="Name" value={profile.name} onChange={(name) => setProfile({ ...profile, name })} />
        <Input label="Email" value={profile.email} onChange={(email) => setProfile({ ...profile, email })} />
        <Input label="Education" value={profile.education} onChange={(education) => setProfile({ ...profile, education })} />
        <Input label="Experience" value={profile.experience} onChange={(experience) => setProfile({ ...profile, experience })} />
        <Input label="Skills" value={profile.skills.join(', ')} onChange={(skills) => {
          const list = skills.split(',').map((s) => s.trim()).filter(Boolean);
          setProfile({ ...profile, skills: list });
          setSetup({ ...setup, skills: list });
        }} />
        <label className="field">
          <span>Resume text</span>
          <textarea value={profile.resume_text} onChange={(event) => setProfile({ ...profile, resume_text: event.target.value })} />
        </label>
      </Panel>
      <Panel title="Interview Setup">
        <Input label="Job role" value={setup.job_role} onChange={(job_role) => setSetup({ ...setup, job_role })} />
        <Select label="Experience level" value={setup.experience_level} options={['Fresher', 'Junior', 'Mid-level', 'Senior']} onChange={(experience_level) => setSetup({ ...setup, experience_level })} />
        <Select label="Interview type" value={setup.interview_type} options={['Technical', 'HR', 'Behavioral', 'Technical + HR', 'Mixed']} onChange={(interview_type) => setSetup({ ...setup, interview_type })} />
        <Select label="Difficulty" value={setup.difficulty} options={['Easy', 'Medium', 'Hard']} onChange={(difficulty) => setSetup({ ...setup, difficulty })} />
        <Input label="Number of questions" type="number" value={setup.question_count} onChange={(question_count) => setSetup({ ...setup, question_count: Number(question_count) })} />
        <Input label="Duration minutes" type="number" value={setup.duration_minutes} onChange={(duration_minutes) => setSetup({ ...setup, duration_minutes: Number(duration_minutes) })} />
        <button className="primary wide" onClick={startInterview}><Play size={18} /> Start AI Interview</button>
      </Panel>
    </section>
  );
}

function InterviewScreen({ question, index, total, onSubmit, onFinish, disabled }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('First, OOP means object oriented programming. It includes encapsulation, inheritance, abstraction and polymorphism. For example, in my Java project I used classes and interfaces to separate business logic from database operations.');
  const [startedAt, setStartedAt] = useState(null);
  const displayIndex = Math.min(index, total);
  const complete = index > total;
  const progress = Math.min(100, Math.round((displayIndex / total) * 100));

  async function requestMedia() {
    const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setStream(media);
    if (videoRef.current) videoRef.current.srcObject = media;
  }

  function toggleRecording() {
    if (!stream) return requestMedia();
    setRecording((value) => !value);
    setStartedAt(Date.now());
  }

  function submit() {
    const duration = startedAt ? Math.max(12, Math.round((Date.now() - startedAt) / 1000)) : 75;
    onSubmit(transcript, duration);
    setRecording(false);
  }

  return (
    <section className="interview-layout">
      <div className="interview-main">
        <div className="consent"><ShieldCheck size={18} /> Camera, microphone, transcript and analysis data are captured only after consent.</div>
        <Panel>
          <div className="question-head">
            <span>{complete ? 'Interview complete' : `Question ${displayIndex} of ${total}`}</span>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
          </div>
          <h2>{complete ? 'All selected questions are complete. Open your report now.' : disabled ? 'Start an interview from setup first.' : question.text}</h2>
          <p className="muted">Focus area: {question.focus_area}</p>
          <label className="field">
            <span>Transcript from speech-to-text</span>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} />
          </label>
          <div className="actions">
            <button className={recording ? 'danger' : 'primary'} onClick={toggleRecording}>
              {recording ? <Square size={18} /> : <Mic size={18} />} {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button onClick={submit} disabled={disabled || complete}><CheckCircle2 size={18} /> Submit Answer</button>
            <button onClick={() => onSubmit('I would like to skip this question and practice it later.', 15)} disabled={disabled || complete}><SkipForward size={18} /> Skip</button>
            <button className="ghost" onClick={onFinish} disabled={disabled}>Finish Interview</button>
          </div>
        </Panel>
      </div>
      <aside className="video-column">
        <div className="avatar">
          <Brain size={48} />
          <strong>AI Interviewer</strong>
          <span>Adaptive follow-up enabled</span>
        </div>
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="status-row">
          <span><Camera size={16} /> {stream ? 'Camera on' : 'Camera off'}</span>
          <span><Mic size={16} /> {recording ? 'Recording' : 'Idle'}</span>
        </div>
      </aside>
    </section>
  );
}

function Report({ report }) {
  const scoreRows = Object.entries(report.category_scores).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  return (
    <section className="stack">
      <div className="report-hero">
        <ScoreRing value={report.overall_score} />
        <div>
          <p className="eyebrow">Final interview report</p>
          <h2>{report.ai_summary}</h2>
          <p>{report.completion}</p>
        </div>
      </div>
      <div className="two-column">
        <Panel title="Explainable Scores">
          {scoreRows.map((row) => <Meter key={row.name} label={titleCase(row.name)} value={row.value} />)}
        </Panel>
        <Panel title="Strengths & Improvements">
          <h3>Strengths</h3>
          <ul>{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Weaknesses</h3>
          <ul>{report.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
        </Panel>
      </div>
      <Panel title="Answer Analytics">
        <div className="answer-list">
          {report.answers.map((answer, index) => (
            <article key={answer.question_id}>
              <strong>Question {index + 1}</strong>
              <p>{answer.transcript}</p>
              <div className="mini-grid">
                <Meter label="Text" value={answer.text.score} />
                <Meter label="Audio" value={answer.audio.score} />
                <Meter label="Video" value={answer.video.score} />
                <Meter label="Overall" value={answer.scores.overall} />
              </div>
              <p className="muted">Attention weights: Text {answer.fusion_weights.text}, Audio {answer.fusion_weights.audio}, Video {answer.fusion_weights.video}</p>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function HistoryView({ rows }) {
  const improvement = rows.length >= 2 ? rows.at(-1).overall_score - rows[0].overall_score : 16;
  return (
    <Panel title="Interview History">
      <div className="comparison">Progress comparison: <strong>{improvement >= 0 ? `+${improvement}` : improvement}</strong> overall score change</div>
      <div className="table">
        <div className="table-row table-head">
          <span>Date</span><span>Role</span><span>Type</span><span>Overall</span><span>Actions</span>
        </div>
        {rows.map((row) => (
          <div className="table-row" key={row.id}>
            <span>{row.date}</span><span>{row.job_role}</span><span>{row.interview_type}</span><strong>{row.overall_score}/100</strong>
            <span><button>View Report</button><button>Compare</button><button>Practice Again</button></span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AdminView({ fairness }) {
  if (!fairness) return <Panel>Loading fairness audit...</Panel>;
  return (
    <section className="stack">
      <div className="kpi-grid">
        <Kpi icon={ShieldCheck} label="Disparity" value={fairness.prediction_disparity} />
        <Kpi icon={Gauge} label="Parity gap" value={fairness.demographic_parity_gap} />
        <Kpi icon={Brain} label="Leakage risk" value={fairness.feature_leakage_risk} />
      </div>
      <Panel title="Fairness Audit">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fairness.groups}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="group" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="average_score" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="muted">Equalized-odds-style gap: {fairness.equalized_odds_gap}. Protected attributes are reserved for opt-in aggregate audits.</p>
      </Panel>
    </section>
  );
}

function Panel({ title, children }) {
  return <div className="panel">{title && <h2>{title}</h2>}{children}</div>;
}

function Kpi({ icon: Icon, label, value }) {
  return <div className="kpi"><Icon size={21} /><span>{label}</span><strong>{value}</strong></div>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Meter({ label, value }) {
  return <div className="meter"><div><span>{label}</span><strong>{value}/100</strong></div><i><b style={{ width: `${value}%` }} /></i></div>;
}

function ScoreRing({ value }) {
  return <div className="score-ring" style={{ '--score': `${value * 3.6}deg` }}><strong>{value}</strong><span>Overall</span></div>;
}

function mockAnalysis(payload) {
  const words = payload.transcript.split(/\s+/).filter(Boolean);
  const filler = words.filter((w) => ['um', 'uh', 'like', 'actually'].includes(w.toLowerCase())).length;
  const text = Math.min(92, 64 + Math.round(words.length / 5));
  const audio = Math.max(58, 86 - filler * 4);
  const video = 81;
  return {
    question_id: payload.question_id,
    transcript: payload.transcript,
    text: { score: text, metrics: { relevance: text, technical_accuracy: text - 4 }, feedback: ['Add specific terms and examples.'] },
    audio: { score: audio, metrics: { speaking_speed_wpm: 132, filler_words: filler, pauses: 2, fluency: audio }, feedback: ['Keep pace steady.'] },
    video: { score: video, metrics: { eye_contact: 78, posture: 'Good', facial_engagement: 82 }, feedback: ['Eye contact is steady.'] },
    fusion_weights: { text: 0.39, audio: 0.31, video: 0.3 },
    scores: { communication: Math.round((text + audio) / 2), confidence: Math.round((audio + video) / 2), domain_knowledge: text, non_verbal: video, overall: Math.round((text + audio + video) / 3) },
    feedback: { positive: ['Clear explanation'], improvement: ['Add one project example'], suggested_answer: ['Define, explain, example, trade-off.'] },
    next_question: { id: `q-${Number(payload.question_id.split('-')[1] || 1) + 1}`, text: 'Can you explain when you would choose this approach in a real project?', focus_area: 'follow-up' },
  };
}

function mockReport(id, analyses) {
  const answers = analyses.length ? analyses : [mockAnalysis({ question_id: 'q-1', transcript: 'I explained encapsulation, inheritance, abstraction and polymorphism with a Java project example.' })];
  const avg = (key) => Math.round(answers.reduce((sum, answer) => sum + answer.scores[key], 0) / answers.length);
  const category_scores = {
    communication: avg('communication'),
    confidence: avg('confidence'),
    domain_knowledge: avg('domain_knowledge'),
    non_verbal: avg('non_verbal'),
  };
  const overall_score = Math.round(Object.values(category_scores).reduce((a, b) => a + b, 0) / 4);
  return {
    interview_id: id,
    overall_score,
    completion: `${answers.length} answers analyzed`,
    category_scores,
    strengths: ['Domain Knowledge', 'Non-Verbal Behavior'],
    weaknesses: ['Reduce filler words', 'Improve answer structure'],
    ai_summary: 'You demonstrate solid technical knowledge and can improve by giving more structured examples.',
    answers,
  };
}

function pageTitle(route) {
  return {
    dashboard: 'Candidate Dashboard',
    setup: 'Interview Setup',
    interview: 'Live AI Interview',
    report: 'Performance Report',
    history: 'Interview History',
    admin: 'Admin & Fairness Audit',
  }[route];
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

createRoot(document.getElementById('root')).render(<App />);
