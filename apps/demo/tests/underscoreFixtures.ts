// Shared by `tests/underscore.spec.ts` (build) and
// `tests-dev/underscore.spec.ts` (astro dev). Each hidden fixture leaves
// `draft` unset or false; only its `_`-prefixed path keeps it out.
export const HIDDEN = [
  // `posts/_template/index.md`
  { title: "Hidden underscore template", url: "/posts/_template/" },
  // `posts/notes/_wip/hidden-nested.md` (the old URL dropped `_` folders)
  { title: "Hidden underscore nested", url: "/posts/notes/hidden-nested/" },
  {
    title: "Hidden underscore nested",
    url: "/posts/notes/_wip/hidden-nested/",
  },
  // `posts/_hidden-file.md`
  { title: "Hidden underscore file", url: "/posts/_hidden-file/" },
];
export const HIDDEN_TITLES = [...new Set(HIDDEN.map(h => h.title))];
/** Only the hidden fixtures carry this tag. */
export const HIDDEN_TAG = "underscore-hidden";
/** Every fixture also carries this tag, shared with real posts. */
export const SHARED_TAG = "astrosage";
/** `posts/snake_case_names.md`: a mid-name `_` must not hide a post. */
export const CONTROL = {
  title: "Underscores in file names",
  url: "/posts/snake_case_names/",
};
/** Pages that list posts. */
export const LISTS = ["/", "/posts/", "/archives/", `/tags/${SHARED_TAG}/`];
