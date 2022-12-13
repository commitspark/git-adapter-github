export class GraphqlQueryFactoryService {
  public createBlobsContentQuery(
    repositoryOwner: string,
    repositoryName: string,
    ref: string,
    path: string,
  ): string {
    return `
      query { 
        repository(owner:"${repositoryOwner}", name:"${repositoryName}") {
          object(expression:"${ref}:${path}") {
            ... on Tree {
              entries {
                name
                object {
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

  public createBlobContentQuery(
    repositoryOwner: string,
    repositoryName: string,
    ref: string,
    schemaFilePath: string,
  ): string {
    return `
      query { 
        repository(owner:"${repositoryOwner}", name:"${repositoryName}") {
          object(expression:"${ref}:${schemaFilePath}") {
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
        $repositoryNameWithOwner:String!,
        $branchName:String!,
        $commitMessage:String!,
        $precedingCommitSha:GitObjectID!,
        $additions:[FileAddition!],
        $deletions:[FileDeletion!]
      ) {
        commitCreate: createCommitOnBranch(input:{
          branch:{
            repositoryNameWithOwner:$repositoryNameWithOwner
            branchName:$branchName
          }
          message: {
            headline:$commitMessage
            body:""
          }
          expectedHeadOid:$precedingCommitSha
          fileChanges:{
            additions:$additions
            deletions:$deletions
          }
        }) {
          commit {
            oid
          }
        }
      }
    `
  }

  public createLatestCommitQuery(
    repositoryOwner: string,
    repositoryName: string,
    ref: string,
  ): string {
    return `
      query Content { 
        repository(owner:"${repositoryOwner}", name:"${repositoryName}") {
          ref(qualifiedName:"${ref}") {
            target {
              oid
            }
          }
          object(expression:"${ref}") {
            oid
          } 
        }
      }
    `
  }
}
