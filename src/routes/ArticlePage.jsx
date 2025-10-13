import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RemoteArticleView from '../components/RemoteArticleView.jsx';
import { useTheme } from '../components/Themes+Styles.jsx';

const ArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();

  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <RemoteArticleView
        slug={slug}
        theme={colors}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};

export default ArticlePage;
