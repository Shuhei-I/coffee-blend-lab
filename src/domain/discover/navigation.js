export function readDiscoverPostId(search = "") {
  return new URLSearchParams(search).get("post")?.trim() || null;
}

export function buildDiscoverUrl(currentUrl, postId) {
  const url = new URL(currentUrl);
  if (postId) url.searchParams.set("post", postId);
  else url.searchParams.delete("post");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getInitialAppPage(search = "") {
  return readDiscoverPostId(search) ? "discover" : "blend";
}
