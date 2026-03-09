export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  newLineNumber?: number;
  oldLineNumber?: number;
}

export function parseDiff(rawDiff: string): DiffFile[] {
  const files: DiffFile[] = [];
  if (!rawDiff || !rawDiff.trim()) return files;

  const diffSegments = rawDiff.split(/^diff --git /m).filter(s => s.trim());

  for (const segment of diffSegments) {
    const lines = segment.split('\n');

    let oldPath = 'null';
    let newPath = 'null';

    for (const line of lines) {
      if (line.startsWith('--- a/')) {
        oldPath = line.slice(6);
      } else if (line.startsWith('--- /dev/null')) {
        oldPath = 'null';
      } else if (line.startsWith('+++ b/')) {
        newPath = line.slice(6);
      } else if (line.startsWith('+++ /dev/null')) {
        newPath = 'null';
      }
    }

    // If we didn't find --- / +++ lines, try to parse from the header
    if (oldPath === 'null' && newPath === 'null') {
      const headerMatch = lines[0].match(/^a\/(.+?) b\/(.+)/);
      if (headerMatch) {
        oldPath = headerMatch[1];
        newPath = headerMatch[2];
      }
    }

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldCount: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1,
          newStart: parseInt(hunkMatch[3], 10),
          newCount: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1,
          lines: [],
        };
        hunks.push(currentHunk);
        oldLineNum = currentHunk.oldStart;
        newLineNum = currentHunk.newStart;
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLineNum,
        });
        newLineNum++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNumber: oldLineNum,
        });
        oldLineNum++;
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });
        oldLineNum++;
        newLineNum++;
      } else if (line.startsWith('\\ No newline at end of file')) {
        // skip
      }
    }

    files.push({ oldPath, newPath, hunks });
  }

  return files;
}

export function getAddedLines(diffFiles: DiffFile[]): Array<{ file: string; line: number; content: string }> {
  const result: Array<{ file: string; line: number; content: string }> = [];

  for (const file of diffFiles) {
    const filePath = file.newPath !== 'null' ? file.newPath : file.oldPath;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') {
          result.push({
            file: filePath,
            line: line.newLineNumber ?? 0,
            content: line.content,
          });
        }
      }
    }
  }

  return result;
}
