import { useEffect, useState } from "react";
import StepRail from "./components/StepRail.jsx";
import UploadStyleGuide from "./components/UploadStyleGuide.jsx";
import ProfileReview from "./components/ProfileReview.jsx";
import AssetChecker from "./components/AssetChecker.jsx";
import ResultsView from "./components/ResultsView.jsx";
import { getProfile } from "./api.js";

export default function App() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setStep(2);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function canJump(n) {
    if (n === 1) return true;
    if (n === 2) return !!profile;
    if (n === 3) return !!profile;
    if (n === 4) return results.length > 0;
    return false;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl text-ink">CI Check</span>
            <span className="font-mono text-[11px] text-ink/45 uppercase tracking-wide">
              Corporate Identity Auditor
            </span>
          </div>
          {profile?.brand_name && (
            <span className="font-mono text-xs text-ink/50">{profile.brand_name}</span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        <aside className="md:sticky md:top-24 md:self-start">
          <StepRail current={step} onJump={setStep} canJump={canJump} />
        </aside>

        <main>
          {checking ? (
            <p className="font-mono text-sm text-ink/50">Lade…</p>
          ) : (
            <>
              {step === 1 && (
                <UploadStyleGuide
                  onProfileReady={(p) => {
                    setProfile(p);
                    setStep(2);
                  }}
                />
              )}
              {step === 2 && profile && (
                <ProfileReview
                  profile={profile}
                  onContinue={(p) => {
                    setProfile(p);
                    setStep(3);
                  }}
                />
              )}
              {step === 3 && (
                <AssetChecker
                  onResults={(r) => {
                    setResults(r);
                    setStep(4);
                  }}
                />
              )}
              {step === 4 && results.length > 0 && (
                <ResultsView results={results} onNewCheck={() => setStep(3)} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
