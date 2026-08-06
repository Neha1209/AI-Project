export async function getDiff(prUrl) {
  // TODO: parse owner, repo, and pull number out of prUrl
  // TODO: call the GitHub API with the right URL and headers
  // TODO: return the diff text
  prUrl.split('/')
  const urlParts = prUrl.split('/')
  const owner = urlParts[3]
  const repo = urlParts[4]
  const pullNumber = urlParts[6]

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      //content negotiation : By setting this specific Accept header, 
      // we're telling GitHub's server "actually, give me the raw unified diff text instead 
      // of JSON"
      Accept: 'application/vnd.github.v3.diff',
    },
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }
//since we asked for a diff (plain text), we parse the response body as text, not JSON. 
  const diffText = await res.text()
  return diffText
}

// Acts as a guardrail to prevent risky files from being merged into the main branch.
export function checkForRiskyFiles(diffText) {
  // Look through diffText for lines like "diff --git a/path/to/file b/path/to/file"
  // Extract the file paths being touched
  // Check if any path contains risky keywords: auth, secret, credential,
  // .github/workflows, deploy, config
  // Return { risky: true/false, matchedFiles: [...] }
  const content = diffText.split('\n');
    const riskyKeywords = ['auth', 'secret', 'credential', '.github/workflows', 'deploy', 'config'];
    const matchedFiles = [];

    for (const line of content) {
        if (line.startsWith('diff --git')) {
            console.log(`Found diff line: ${line}`);
            const filePath = line.split(' ')[2].substring(2); // Get the file path after 'a/'
            console.log(`Checking file: ${filePath}`);
            for (const keyword of riskyKeywords) {
                if (filePath.includes(keyword)) {
                    matchedFiles.push(filePath);
                    break; // No need to check other keywords for this file
                }
            }
        }
    }

    return { risky: matchedFiles.length > 0, matchedFiles };
}
function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name)
}

export function checkNamingConventions(diffText) {
  const lines = diffText.split('\n')
  const violations = []

  for (const line of lines) {
    if (!line.startsWith('+')) continue // only check added lines

    const match = line.match(/^\+\s*(?:const|let|var|function)\s+([a-zA-Z0-9_]+)/)

    if (match) {
      const name = match[1]
      if (!isCamelCase(name)) {
        violations.push(name)
      }
    }
  }

  return { violations, hasViolations: violations.length > 0 }
}

export function estimateTestCoverageGap(diffText) {
  const lines = diffText.split('\n')
  const sourceFiles = []
  const testFiles = []

  for (const line of lines) {
    if (!line.startsWith('diff --git')) continue

    const filePath = line.split(' ')[2].substring(2)

    const looksLikeTest =
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/test/') ||
      filePath.includes('/tests/') ||
      filePath.includes('__tests__')

    if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
      if (looksLikeTest) {
        testFiles.push(filePath)
      } else {
        sourceFiles.push(filePath)
      }
    }
  }

  return {
    sourceFilesChanged: sourceFiles,
    testFilesChanged: testFiles,
    likelyMissingTests: sourceFiles.length > 0 && testFiles.length === 0,
  }
}