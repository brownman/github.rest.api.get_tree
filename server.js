const express = require("express");
const path = require("path");
const axios = require("axios");

const app = express();
const port = 3000; // default port to listen
let db = {}; // simulate db store

const commonRequests = {
  get_http_body: (url, options) => {
    console.log("GET url", url);

    return axios
      .get(url, options)
      .then((res) => {
        console.log("Status Code:", res.status);
        return res.data;
      })
      .catch((e) => {
        console.log("Error: ", e.message);
        throw e;
      });
  },
  get_from_cache: (db, cache_key, resTree_sha) => {
    if (db[cache_key] && db[cache_key].hash == resTree_sha) {
      //try to serve the tree from the db if it has the same hash
      return db[cache_key];
    }
    return null;
  },
  set_cache: (db, cache_key, resTree_sha, resTree_RecursiveTree) => {
    db[cache_key] = {}; //override cached value if exists

    db[cache_key].hash = resTree_sha; //update the hash
    db[cache_key].tree = resTree_RecursiveTree; //update the tree content
  },
};

const githubApi = {
  //github rest API requires a tree's hashed value or a branch name, it's nicer to start with a branch name
  get_default_branch_for_repo: async (username, repo) => {
    const url = "https://api.github.com/repos/" + username + "/" + repo;
    let res;
    console.log({ url });

    try {
      res = await commonRequests.get_http_body(url, {
        params: { date: Date.now() }, //try to add params to disable any caching machanism
      });
    } catch (e) {
      throw e;
    }

    return res["default_branch"];
  },

  //use github rest API to get a repo's  tree (options: shallow/recursive)
  get_tree: async (username, repo, options) => {
    let default_branch;

    try {
      default_branch = await githubApi.get_default_branch_for_repo(
        username,
        repo
      );
    } catch (e) {
      throw e;
    }

    console.log({ default_branch });
    const url =
      "https://api.github.com/repos/" +
      username +
      "/" +
      repo +
      "/git/trees/" +
      default_branch;

    let res;
    try {
      res = await commonRequests.get_http_body(url, options);
      return res;
    } catch (e) {
      throw e;
    }
  },
  //use github rest API to get a repo's recursive tree
  get_tree_recursive: (username, repo) => {
    return githubApi.get_tree(username, repo, {
      params: { recursive: 1, date: Date.now() },
    });
  },
};

//express default route
app.get("/", (req, res) => {
  res.send("play with github rest API for getting a repo's tree");
});

//the main endpoint we like to serve and cache for farther requests
app.get("/tree", async (req, res) => {
  console.log(req.query);
  const username = req.query["username"];
  const repo = req.query["repo"];

  if (!repo || !username) {
    return res.send("no username or no repo so no tree");
  }

  //shallow fetching first - just to get the repo's updated hash to compare with our cache
  let res_tree;

  res_tree = await githubApi.get_tree(username, repo).catch((e) => {
    return res.send(e.message);
  });

  const cache_key = JSON.stringify({ username, repo });

  let res_tree_content;

  res_tree_content = commonRequests.get_from_cache(db, cache_key, res_tree.sha);

  //if cache exists
  if (res_tree_content) {
    return res.json({ repo, username, from_cache: true, res_tree_content });
  }

  let res_tree_recursive;
  try {
    res_tree_recursive = await githubApi.get_tree_recursive(username, repo);
  } catch (e) {
    console.log(e);
    return res.send(e.message);
  }

  console.log({ "res_tree_recursive.sha": res_tree_recursive.sha });

  //update db for a new cache entry
  commonRequests.set_cache(
    db,
    cache_key,
    res_tree_recursive.sha,
    res_tree_recursive.tree
  );

  res.json({ repo, username, from_cache: false, res_tree_recursive });
});

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
