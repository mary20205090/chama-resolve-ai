import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Upload
} from 'lucide-react';
import { api } from './api.js';

const disputeTypes = [
  ['late_contribution', 'Late contribution'],
  ['missed_payout', 'Missed payout'],
  ['fine_or_penalty', 'Fine or penalty'],
  ['loan_repayment', 'Loan repayment'],
  ['record_mismatch', 'Record mismatch'],
  ['other', 'Other']
];

const initialForm = {
  chamaName: '',
  disputeType: 'late_contribution',
  disputeDescription: '',
  members: ''
};

export default function App() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState({
    boot: true,
    caseCreate: false,
    documents: false,
    upload: false,
    analysis: false
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    refreshCases();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    loadCaseWorkspace(selectedCaseId);
  }, [selectedCaseId]);

  const selectedStatus = useMemo(() => statusLabel(selectedCase?.status), [selectedCase]);

  async function refreshCases() {
    setError('');
    setLoading((state) => ({ ...state, boot: true }));

    try {
      const result = await api.listCases();
      setCases(result.cases || []);
      if (!selectedCaseId && result.cases?.length) setSelectedCaseId(result.cases[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((state) => ({ ...state, boot: false }));
    }
  }

  async function loadCaseWorkspace(caseId) {
    setError('');
    setNotice('');
    setLoading((state) => ({ ...state, documents: true }));

    try {
      const [caseResult, documentResult, analysisResult] = await Promise.all([
        api.getCase(caseId),
        api.listDocuments(caseId),
        api.latestAnalysis(caseId)
      ]);
      setSelectedCase(caseResult.case);
      setDocuments(documentResult.documents || []);
      setAnalysis(analysisResult.analysis || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((state) => ({ ...state, documents: false }));
    }
  }

  async function handleCreateCase(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading((state) => ({ ...state, caseCreate: true }));

    const payload = {
      chamaName: form.chamaName,
      disputeType: form.disputeType,
      disputeDescription: form.disputeDescription,
      members: form.members
        .split(',')
        .map((member) => member.trim())
        .filter(Boolean)
    };

    try {
      const result = await api.createCase(payload);
      setForm(initialForm);
      setCases((current) => [result.case, ...current]);
      setSelectedCaseId(result.case.id);
      setSelectedCase(result.case);
      setDocuments([]);
      setAnalysis(null);
      setNotice('Case created.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((state) => ({ ...state, caseCreate: false }));
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!selectedCaseId || !selectedFiles.length) return;

    setError('');
    setNotice('');
    setLoading((state) => ({ ...state, upload: true }));

    try {
      await api.uploadDocuments(selectedCaseId, selectedFiles);
      setSelectedFiles([]);
      setNotice('Evidence uploaded.');
      await loadCaseWorkspace(selectedCaseId);
      await refreshCases();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((state) => ({ ...state, upload: false }));
    }
  }

  async function handleAnalyze() {
    if (!selectedCaseId) return;

    setError('');
    setNotice('');
    setLoading((state) => ({ ...state, analysis: true }));

    try {
      const result = await api.analyzeCase(selectedCaseId);
      setAnalysis(result.analysis);
      setNotice('Analysis complete.');
      await refreshCases();
      await loadCaseWorkspace(selectedCaseId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((state) => ({ ...state, analysis: false }));
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="sidebar" aria-label="Cases">
          <div className="brand-row">
            <div>
              <h1>Chama Resolve AI</h1>
              <p>Evidence-based dispute review</p>
            </div>
            <button className="icon-button" type="button" onClick={refreshCases} title="Refresh cases">
              <RefreshCw size={18} />
            </button>
          </div>

          <form className="case-form" onSubmit={handleCreateCase}>
            <div className="form-row">
              <label htmlFor="chamaName">Chama</label>
              <input
                id="chamaName"
                value={form.chamaName}
                onChange={(event) => setForm({ ...form, chamaName: event.target.value })}
                placeholder="Umoja Demo Chama"
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="disputeType">Type</label>
              <select
                id="disputeType"
                value={form.disputeType}
                onChange={(event) => setForm({ ...form, disputeType: event.target.value })}
              >
                {disputeTypes.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="members">Members</label>
              <input
                id="members"
                value={form.members}
                onChange={(event) => setForm({ ...form, members: event.target.value })}
                placeholder="Amina, Brian"
              />
            </div>

            <div className="form-row">
              <label htmlFor="disputeDescription">Dispute</label>
              <textarea
                id="disputeDescription"
                value={form.disputeDescription}
                onChange={(event) => setForm({ ...form, disputeDescription: event.target.value })}
                placeholder="Describe the disagreement and what each side is asking for."
                rows={5}
                required
              />
            </div>

            <button className="primary-button" type="submit" disabled={loading.caseCreate}>
              {loading.caseCreate ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
              New case
            </button>
          </form>

          <div className="case-list">
            <div className="list-title">
              <ClipboardList size={17} />
              <span>Cases</span>
            </div>
            {loading.boot ? <p className="muted">Loading cases...</p> : null}
            {!loading.boot && !cases.length ? <p className="muted">No cases yet.</p> : null}
            {cases.map((item) => (
              <button
                className={`case-list-item ${selectedCaseId === item.id ? 'active' : ''}`}
                type="button"
                key={item.id}
                onClick={() => setSelectedCaseId(item.id)}
              >
                <span>{item.chamaName}</span>
                <small>{statusLabel(item.status)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-pane">
          <div className="status-strip">
            {error ? (
              <div className="alert error">
                <AlertTriangle size={17} />
                <span>{error}</span>
              </div>
            ) : null}
            {notice ? (
              <div className="alert success">
                <CheckCircle2 size={17} />
                <span>{notice}</span>
              </div>
            ) : null}
          </div>

          {!selectedCase ? (
            <section className="empty-state">
              <FileText size={34} />
              <h2>Create a dispute case</h2>
            </section>
          ) : (
            <section className="case-workflow">
              <header className="case-header">
                <div>
                  <p className="eyebrow">{selectedStatus}</p>
                  <h2>{selectedCase.chamaName}</h2>
                  <p>{selectedCase.disputeDescription}</p>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading.analysis || !documents.length}
                  title={!documents.length ? 'Upload evidence first' : 'Run analysis'}
                >
                  {loading.analysis ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                  Analyze
                </button>
              </header>

              <div className="workflow-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Evidence</h3>
                    <span>{documents.length} files</span>
                  </div>

                  <form className="upload-form" onSubmit={handleUpload}>
                    <label className="file-drop">
                      <Upload size={20} />
                      <span>{selectedFiles.length ? fileSummary(selectedFiles) : 'PDF, CSV, or TXT'}</span>
                      <input
                        type="file"
                        accept=".pdf,.csv,.txt,text/plain,text/csv,application/pdf"
                        multiple
                        onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                      />
                    </label>
                    <button className="secondary-button" type="submit" disabled={loading.upload || !selectedFiles.length}>
                      {loading.upload ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}
                      Upload
                    </button>
                  </form>

                  <div className="document-list">
                    {loading.documents ? <p className="muted">Loading evidence...</p> : null}
                    {!loading.documents && !documents.length ? <p className="muted">No evidence uploaded.</p> : null}
                    {documents.map((document) => (
                      <article className="document-row" key={document.id}>
                        <FileText size={18} />
                        <div>
                          <strong>{document.fileName}</strong>
                          <p>{document.extractedTextPreview || 'No preview available.'}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel analysis-panel">
                  <div className="panel-heading">
                    <h3>Recommendation</h3>
                    <span>{analysis ? confidenceLabel(analysis.confidenceLevel) : 'Pending'}</span>
                  </div>
                  {analysis ? <AnalysisView analysis={analysis} /> : <p className="muted">Run analysis after uploading evidence.</p>}
                </section>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function AnalysisView({ analysis }) {
  return (
    <div className="analysis-view">
      <ResultBlock title="Summary" content={analysis.disputeSummary} />
      <ResultBlock title="Relevant bylaws" items={analysis.relevantBylaws} />
      <ResultBlock title="Record findings" items={analysis.recordFindings} />
      <ResultBlock title="Missing evidence" items={analysis.missingEvidence} tone="warn" />
      <ResultBlock title="Fairness analysis" content={analysis.fairnessAnalysis} />
      <ResultBlock title="Recommended resolution" content={analysis.recommendedResolution} tone="strong" />
      <ResultBlock title="Next steps" items={analysis.nextSteps} />
      <ResultBlock title="Risks" items={analysis.risks} tone="warn" />
      <p className="disclaimer">{analysis.disclaimer}</p>
    </div>
  );
}

function ResultBlock({ title, content, items, tone = 'default' }) {
  if (!content && !items?.length) return null;

  return (
    <section className={`result-block ${tone}`}>
      <h4>{title}</h4>
      {content ? <p>{content}</p> : null}
      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function statusLabel(status = '') {
  return status.replaceAll('_', ' ') || 'draft';
}

function confidenceLabel(confidence = '') {
  return confidence ? `${confidence} confidence` : 'Pending';
}

function fileSummary(files) {
  if (files.length === 1) return files[0].name;
  return `${files.length} files selected`;
}
