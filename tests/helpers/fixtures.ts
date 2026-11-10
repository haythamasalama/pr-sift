import type { PrFile } from '../../src/lib/types'

export const SAMPLE_DIFF = `diff --git a/src/Domain/Order/Actions/GetOrder.php b/src/Domain/Order/Actions/GetOrder.php
index 111..222 100644
--- a/src/Domain/Order/Actions/GetOrder.php
+++ b/src/Domain/Order/Actions/GetOrder.php
@@ -1,4 +1,5 @@
 <?php
-use Old\\Thing;
+use New\\Thing;
+use Another\\Thing;
 final class GetOrder
diff --git a/resources/js/new.ts b/resources/js/new.ts
new file mode 100644
index 0000000..333
--- /dev/null
+++ b/resources/js/new.ts
@@ -0,0 +1,2 @@
+export const a = 1
+export const b = 2
diff --git a/docs/old.md b/docs/old.md
deleted file mode 100644
index 444..0000000
--- a/docs/old.md
+++ /dev/null
@@ -1,2 +0,0 @@
-# Old
-text
diff --git a/img/logo.png b/img/logo.png
index 555..666 100644
Binary files a/img/logo.png and b/img/logo.png differ
diff --git a/README.md b/docs/README.md
similarity index 100%
rename from README.md
rename to docs/README.md
`

export function file(filename: string, overrides: Partial<PrFile> = {}): PrFile {
  return {
    filename,
    status: 'modified',
    additions: 1,
    deletions: 1,
    patch: '@@ -1 +1 @@\n-old\n+new',
    hash: `hash-${filename}`,
    blob_url: `/o/r/pull/1/files`,
    ...overrides,
  }
}

export const PR = { owner: 'o', repo: 'r', number: 7 }
