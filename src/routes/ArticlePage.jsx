import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import RemoteArticleView from '../components/RemoteArticleView.jsx';

const articleAliases = {
  'atrial-fibrillation-in-adults-diagnosis-stroke-prevention-rate-or-rhythm-control-and-ablation': 'atrial-fibrillation'
};

const ArticlePage = () => {
  const { slug } = useParams();
  if (articleAliases[slug]) return <Navigate to={`/articles/${articleAliases[slug]}`} replace />;
  return <RemoteArticleView slug={slug} />;
};

export default ArticlePage;
