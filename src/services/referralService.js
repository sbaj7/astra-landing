import supabase from './supabaseClient.js';

const invoke = async (action, payload = {}) => {
  const { data, error } = await supabase.functions.invoke('referral-admin', {
    body: { action, ...payload }
  });

  if (error) {
    let message = error.message || 'Referral management request failed';
    const body = await error.context?.json?.().catch(() => null);
    if (body?.error) message = body.error;
    const requestError = new Error(message);
    requestError.status = error.context?.status;
    throw requestError;
  }

  return data;
};

export const referralService = {
  async getDashboard() {
    const data = await invoke('get_dashboard');
    return data.dashboard;
  },

  async createPartner(partner) {
    return await invoke('create_partner', { partner });
  },

  async setCodeStatus(codeId, active) {
    return await invoke('set_code_status', { codeId, active });
  },

  async recordPayout(payout) {
    return await invoke('record_payout', { payout });
  }
};

export default referralService;
