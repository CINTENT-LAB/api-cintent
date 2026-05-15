import React, { useEffect, useState } from 'react';
import Joyride, { Step } from 'react-joyride';

const steps: Step[] = [
  { target: '[data-tour="domain-switcher"]', content: 'Switch domains here. Ask COGNI, APIs, simulations, and replay context should update with the workspace.' },
  { target: '[data-tour="ask-cogni-input"]', content: 'Ask COGNI uses the active workspace, selected app, workflow, APIs, and simulation state.' },
  { target: '[data-tour="replay-button"]', content: 'Replay reconstructs actions, orchestration lineage, telemetry, and governance checkpoints.' },
  { target: '[data-tour="orchestration-graph"]', content: 'The orchestration graph proves live execution instead of a static mock.' }
];

export function GuidedTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('cintent.hasSeenTour') !== 'true') {
      setRun(true);
      sessionStorage.setItem('cintent.hasSeenTour', 'true');
    }
  }, []);

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      styles={{ options: { zIndex: 10000 } }}
      callback={state => {
        if (['finished', 'skipped'].includes(state.status)) setRun(false);
      }}
    />
  );
}
