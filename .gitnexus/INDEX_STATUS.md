# GitNexus Index Status — Centralized_SAS_repository

> Last analyzed: **2026-05-01 at 21:27 PHT** (commit `177bdf4c`)

---

## 📊 Index Summary

| Metric       | Count |
|--------------|-------|
| **Files**    | 53    |
| **Nodes**    | 1,744 |
| **Edges**    | 2,538 |
| **Clusters** | 66    |
| **Flows**    | 102   |

> Previous index (Apr 23): 1,088 nodes / 1,598 edges / 34 clusters / 73 flows
> Growth since last index: **+60% nodes, +59% edges, +94% clusters, +40% flows**

---

## 🧩 Functional Clusters (Named)

These are the semantically meaningful clusters identified by GitNexus.
Unnamed clusters (Cluster_N) are loosely coupled utility groups.

| Cluster               | Symbols | Cohesion | Notes                                      |
|-----------------------|---------|----------|--------------------------------------------|
| **File-hub**          | 45      | 100%     | Largest module — file browsing & management |
| **Attendance-viewer** | 11      | 100%     | Attendance log rendering & filtering        |
| **Schedule-manager**  | 7       | 100%     | Schedule display & event management         |
| **Masterlist-manager**| 5       | 100%     | Student masterlist CRUD                     |
| **Messaging**         | 8       | 95%      | Shared + full messenger init & rendering    |
| **Tv**                | 7       | 92%      | TV display mode, YouTube/FB/Drive polling   |
| **Cluster_12**        | 9       | 89%      | —                                           |
| **Cluster_4**         | 9       | 87%      | —                                           |
| **Cluster_13**        | 15      | 84%      | —                                           |
| **Cluster_1**         | 12      | 76%      | —                                           |
| **Cluster_14**        | 14      | 75%      | —                                           |
| **Cluster_18**        | 6       | 77%      | —                                           |
| **Cluster_3**         | 10      | 71%      | —                                           |
| **Cluster_2**         | 5       | 71%      | —                                           |
| **Cluster_17**        | 5       | 71%      | —                                           |
| **Cluster_8**         | 10      | 68%      | —                                           |
| **Cluster_9**         | 7       | 70%      | —                                           |

---

## 🔁 Top Execution Flows (Processes)

Top 20 of 102 tracked flows. Use `gitnexus_query` to search deeper.

| Flow                                         | Type              | Steps |
|----------------------------------------------|-------------------|-------|
| InitSharedMessaging → RenderFullContacts      | cross_community   | 6     |
| InitUserMessaging → RenderFullContacts        | cross_community   | 6     |
| InitFullMessenger → RenderFullContacts        | intra_community   | 5     |
| StartYTPolling → EscapeHtml                   | cross_community   | 5     |
| StartYTPolling → GetYouTubeVideoId            | cross_community   | 5     |
| StartYTPolling → GetFacebookVideoUrl          | cross_community   | 5     |
| StartYTPolling → GetDriveId                   | cross_community   | 5     |
| FetchEvents → SetState                        | intra_community   | 5     |
| FetchEvents → BuildHeaders                    | intra_community   | 5     |
| FetchEvents → RenderTable                     | intra_community   | 5     |
| Init → SetState                               | intra_community   | 4     |
| Init → BuildHeaders                           | intra_community   | 4     |
| Init → RenderTable                            | intra_community   | 4     |
| InitSharedMessaging → GetEl                   | cross_community   | 4     |
| FinishInit → EscapeHtml                       | cross_community   | 4     |
| FinishInit → GetYouTubeVideoId                | cross_community   | 4     |
| FinishInit → GetFacebookVideoUrl              | cross_community   | 4     |
| FinishInit → GetDriveId                       | cross_community   | 4     |
| ShowAppUI → Cleanup                           | cross_community   | 4     |
| ShowAppUI → ShowToast                         | cross_community   | 4     |

---

## 🔧 Re-indexing

If the index becomes stale (i.e., many commits have been made since the date above), run:

```bash
npx gitnexus analyze
```

Check staleness at any time:

```bash
npx gitnexus status
```

---

## 📌 Quick GitNexus MCP Reference

| Task                        | Tool                  |
|-----------------------------|-----------------------|
| Search for a concept/flow   | `gitnexus_query`      |
| 360° view of a symbol       | `gitnexus_context`    |
| Blast radius before editing | `gitnexus_impact`     |
| Check impact of git changes | `gitnexus_detect_changes` |
| Raw graph queries           | `gitnexus_cypher`     |
| Safe multi-file rename      | `gitnexus_rename`     |
