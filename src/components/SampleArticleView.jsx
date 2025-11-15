import React from 'react';
import RemoteArticleView from './RemoteArticleView.jsx';

const SampleArticleView = ({ theme, onBack }) => (
  <RemoteArticleView
    slug="early-inpatient-management-of-acute-pulmonary-embolism"
    theme={theme}
    onBack={onBack}
  />
);

export default SampleArticleView;
