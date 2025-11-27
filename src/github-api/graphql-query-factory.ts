export function createBlobsContentQuery(): string {
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

export function createFilenamesQuery(): string {
  return `
      query ($repositoryOwner: String!, $repositoryName: String!, $expression: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
              }
            }
          }
        }
      }
    `
}

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

    let query = `
      query ($repositoryOwner: String!, $repositoryName: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {`

    for (const [j, filename] of batchFilenames.entries()) {
      const fileAliasIndex = fileIndex + j
      const queryFileAlias = `file${fileAliasIndex}`
      query += `    ${queryFileAlias}: object(expression: "${commitHash}:${filename}") {
      ... on Blob {
          text
        }
      }
`
      queryFilenameAliasMap.set(queryFileAlias, filename)
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
        $commitMessage: String!,
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
            headline: $commitMessage
            body:""
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
      query ($repositoryOwner: String!, $repositoryName: String!, $ref: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
          ref(qualifiedName: $ref) {
            target {
              oid
            }
          }
          object(expression: $ref) {
            oid
          } 
        }
      }
    `
}
