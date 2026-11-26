export function createSingleBlobContentQuery(): string {
  return `
      query ($repositoryOwner: String!, $repositoryName: String!, $expression: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
          object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    `
}

export const COMMIT_ALIAS = 'commit'

export function createBlobsContentByFilePathsQuery(
  filePaths: string[],
  commitHash: string,
  batchSize: number,
): { queries: string[]; queryFilenameAliasMap: Map<string, string> } {
  const queries = []
  const queryFilenameAliasMap = new Map<string, string>()
  for (
    let fileIndex = 0;
    fileIndex < filePaths.length;
    fileIndex += batchSize
  ) {
    // cut file content query into batches and use GraphQL aliases for maximum throughput in regard to GitHub API limits

    const batchFilenames = filePaths.slice(fileIndex, fileIndex + batchSize)

    // every batch checks the commit, as a missing file cannot be told apart from a missing commit otherwise
    let query = `
      query ($repositoryOwner: String!, $repositoryName: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
    ${COMMIT_ALIAS}: object(expression: ${JSON.stringify(commitHash)}) {
      ... on Commit {
        oid
      }
    }
`

    for (const [j, filename] of batchFilenames.entries()) {
      const fileAliasIndex = fileIndex + j
      const fileAlias = `file${fileAliasIndex}`
      // using one query variable per file would significantly blow up query size, which would in turn require a lower
      // batch size to avoid GitHub erroring out, and in consequence much lower throughput; we therefore use this poor
      // man's manual escaping of filenames instead and write them directly into the query strings
      const escapedExpression = JSON.stringify(`${commitHash}:${filename}`)
      query += `    ${fileAlias}: object(expression: ${escapedExpression}) {
      ... on Blob {
          text
        }
      }
`
      queryFilenameAliasMap.set(fileAlias, filename)
    }
    query += `  }
}`
    queries.push(query)
  }

  return { queries, queryFilenameAliasMap }
}

export function createCommitMutation(): string {
  return `
      mutation (
        $repositoryNameWithOwner: String!,
        $branchName: String!,
        $commitHeadline: String!,
        $commitBody: String,
        $precedingCommitSha: GitObjectID!,
        $additions: [FileAddition!],
        $deletions: [FileDeletion!]
      ) {
        commitCreate: createCommitOnBranch(input: {
          branch: {
            repositoryNameWithOwner: $repositoryNameWithOwner
            branchName: $branchName
          }
          message: {
            headline: $commitHeadline
            body: $commitBody
          }
          expectedHeadOid: $precedingCommitSha
          fileChanges: {
            additions: $additions
            deletions: $deletions
          }
        }) {
          commit {
            oid
          }
        }
      }
    `
}

export function createLatestCommitQuery(): string {
  return `
      query ($repositoryOwner: String!, $repositoryName: String!, $ref: String!, $branchRef: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
          branch: ref(qualifiedName: $branchRef) {
            target {
              ... on Commit {
                oid
              }
            }
          }
          ref(qualifiedName: $ref) {
            target {
              ... on Commit {
                oid
              }
              ... on Tag {
                target {
                  ... on Commit {
                    oid
                  }
                }
              }
            }
          }
          object(expression: $ref) {
            ... on Commit {
              oid
            }
          }
        }
      }
    `
}
