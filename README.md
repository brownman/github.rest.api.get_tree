
# Github REST API: get-a-tree

## TASK:
- implement a simple server that inquires a public Github repository 
- builds the repo's entire file tree by supplying username and repository name.
- utilize the following Github Api endpoint: `https://docs.github.com/en/rest/reference/git#get-a-tree`

## instructions:
- access the server on: `http://localhost:3000/tree?username=<Some-github-username>&repo=<his-repository-name>`

## current flow 
- The server picks the repository's default branch
- store result on  cache on first request
- serve data from cache starting from the second request
- reset cache when the repository gets updated

## Optimizations
- minimize downloads from Github Api by first fetching the latest tree hash (in a non-recursive approach)
- request the whole tree if latest tree's hash is different from the already cached one.
 
## Todo:
- manage a que to store the cached items
- set item priority depends on usage frequency

## Easy Deploy and Test:
- upon visiting this Github repository: 
- click the "GitPod" button
- run `npm install`
- run `npm start`
- access internal browser at: `<your gitpod instanse url>/tree?username=<username>&repo=<repo>`
