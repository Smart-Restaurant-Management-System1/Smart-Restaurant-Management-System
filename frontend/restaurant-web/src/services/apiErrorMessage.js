// Turns an axios error into a message that is safe to show to a customer.
// 401/403 are handled here so a role or session problem never surfaces as a raw "Request failed with status code 403".
export const getApiErrorMessage = (err, fallback) => {
  const status = err?.response?.status;

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'This feature is available to customer accounts only. Please sign in with a customer account.';
  }

  return err?.response?.data?.message || fallback;
};
