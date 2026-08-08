/** Check LinkedIn login via li_at cookie — SW or extension page only. Never log the value. */
export async function isLinkedInLoggedIn(): Promise<boolean> {
  const cookie = await chrome.cookies.get({
    url: 'https://www.linkedin.com',
    name: 'li_at',
  })
  return !!cookie?.value
}
