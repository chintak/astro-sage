---
"astro-sage": patch
---

Ignore every post or page under an `_`-prefixed folder, not just `_`-prefixed file names. `posts/_template/index.md` and `posts/notes/_wip/idea.md` no longer load (they were visible in `astro dev` and built unless marked `draft`); `my_post.md` and `a_b/index.md` still load.

If you kept published posts in `_` folders to group them without changing their URLs, move them to a folder without the leading `_`; the folder name then becomes part of the URL.
