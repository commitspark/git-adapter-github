export class GraphqlQueryFactoryService {
  public createBlobsContentQuery(): string {
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
                    text
                  }
                }
              }
            }
          }
        }
      }
    `
  }

  public createBlobContentQuery(): string {
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

  public createCommitMutation(): string {
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

  public createLatestCommitQuery(): string {
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
}
