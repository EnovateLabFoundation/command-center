/**
 * ClientInsights (/portal/insights)
 *
 * Redirect/hub page for the insights sub-routes. Navigates to sentiment
 * dashboard by default.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientInsights() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/portal/insights/sentiment', { replace: true });
  }, [navigate]);
  return null;
}
