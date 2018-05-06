import _get from 'lodash.get';
import _has from 'lodash.has';
import request from 'superagent';

export const getAccountId = host => host.replace('.atlassian.net', '').trim();

export const getRapidViewId = url => {
  const re = /rapidView=(\d+)/;
  const m = re.exec(url);
  return m ? m[1] : null;
};

export const addPointsByCategory = (
  assigneePoints = {},
  statusCategory,
  pointsToAdd
) => {
  const oldValue = assigneePoints[statusCategory] || 0;

  return {
    ...assigneePoints,
    [statusCategory]: oldValue + pointsToAdd,
  };
};

export const getStatusCategoryMap = mappedColumns => {
  const map = {};
  mappedColumns.forEach(column => {
    const mappedStatuses = _get(column, 'mappedStatuses', []);
    mappedStatuses.forEach(status => {
      const statusId = status.id;
      const statusCategory = _get(status, 'statusCategory.key', '');
      if (statusId && statusCategory) {
        map[statusId] = statusCategory;
      }
    });
  });

  return map;
};

export const getAssigneesFromIssues = issues =>
  issues.reduce((prev, issue) => {
    const assigneeId = issue.assignee;
    if (!assigneeId) {
      return prev;
    }

    if (_has(prev, assigneeId)) {
      return prev;
    }

    return {
      ...prev,
      [assigneeId]: {
        id: assigneeId,
        name: issue.assigneeName,
        avatarUrl: issue.avatarUrl,
      },
    };
  }, {});

export const getIssuesById = (issues, statusCategoryMap) =>
  issues.reduce(
    (prev, issue) => ({
      ...prev,
      [issue.id]: {
        assigneeId: issue.assignee,
        points: _get(issue, 'estimateStatistic.statFieldValue.value', 0),
        statusCategory: statusCategoryMap[issue.statusId],
      },
    }),
    {}
  );

export const getAssigneesBySprint = (assignees, issuesById, issuesIds) =>
  issuesIds.reduce((prev, issueId) => {
    const { assigneeId, points = 0, statusCategory } = issuesById[issueId];
    if (!assigneeId || !points || !statusCategory) return prev;

    return {
      ...prev,
      [assigneeId]: assignees[assigneeId],
    };
  }, {});

export const getAssigneePointsBySprint = (issuesById, issuesIds) =>
  issuesIds.reduce((prev, issueId) => {
    const issue = issuesById[issueId];
    if (!issue) return prev;

    const { assigneeId, points = 0, statusCategory } = issue;
    if (!points || !assigneeId || !statusCategory) return prev;

    const oldAssigneePoints = prev[assigneeId];
    const newAssigneePoints = addPointsByCategory(
      oldAssigneePoints,
      statusCategory,
      points
    );

    return {
      ...prev,
      [issue.assigneeId]: newAssigneePoints,
    };
  }, {});

export const getSprints = (issues, sprints, statusCategoryMap) => {
  const assignees = getAssigneesFromIssues(issues);
  const issuesById = getIssuesById(issues, statusCategoryMap);

  return sprints.map(sprint => {
    const { id, issuesIds, name } = sprint;
    return {
      id,
      name,
      assignees: getAssigneesBySprint(assignees, issuesById, issuesIds),
      pointsByAssignee: getAssigneePointsBySprint(issuesById, issuesIds),
    };
  });
};

const processResponses = responses => {
  const issues = _get(responses, '[0].body.issues', []);
  const sprints = _get(responses, '[0].body.sprints', []);
  const statusCategoryMap = getStatusCategoryMap(
    _get(responses, '[1].body.rapidListConfig.mappedColumns', [])
  );

  if (!sprints.length) return null;

  return getSprints(issues, sprints, statusCategoryMap);
};

const fetchData = (callback = () => {}) => () => {
  const { location = {} } = window;
  const accountId = getAccountId(location.host || location.hostname);
  const rapidViewId = getRapidViewId(location.search);

  const urls = [
    `https://${accountId}.atlassian.net/rest/greenhopper/1.0/xboard/plan/backlog/data.json?rapidViewId=${rapidViewId}`,
    `https://${accountId}.atlassian.net/rest/greenhopper/1.0/rapidviewconfig/editmodel.json?rapidViewId=${rapidViewId}`,
  ];

  return Promise.all(urls.map(url => request.get(url).withCredentials())).then(
    responses => {
      const sprints = processResponses(responses);

      if (sprints) {
        callback(new Date(), sprints);
      }
    }
  );
};

export default fetchData;
