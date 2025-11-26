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

export function createBlobIdsQuery(): string {
  return `
      query ($repositoryOwner: String!, $repositoryName: String!, $expression: String!) { 
        repository(owner: $repositoryOwner, name: $repositoryName) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
                object {
                  __typename
                  ... on Blob {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `
}

export function createBlobsContentByIdsQuery(): string {
  return `
      query ($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Blob {
            id
            text
          }
        }
      }
    `
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
