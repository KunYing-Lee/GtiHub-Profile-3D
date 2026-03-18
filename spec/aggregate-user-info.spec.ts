import * as client from '../src/github-graphql';
import * as aggregate from '../src/aggregate-user-info'
import * as type from '../src/type';
import { dummyData } from './dummy-data';

describe('github-graphql', () => {
    it('fetchData', () => {
        const userInfo = aggregate.aggregateUserInfo(dummyData);

        expect(userInfo.contributionCalendar.length).toEqual(371);
        expect(userInfo.contributesLanguage).toEqual([]);
        expect(userInfo.totalLanguageSize).toEqual(0);

        expect(userInfo.totalContributions).toEqual(366);
        expect(userInfo.totalCommitContributions).toEqual(344);
        expect(userInfo.totalIssueContributions).toEqual(4);
        expect(userInfo.totalPullRequestContributions).toEqual(12);
        expect(userInfo.totalPullRequestReviewContributions).toEqual(0);
        expect(userInfo.totalRepositoryContributions).toEqual(6);
        expect(userInfo.totalForkCount).toEqual(0);
        expect(userInfo.totalStargazerCount).toEqual(6);
    });

    it('aggregates repository language sizes across all repositories', () => {
        const response = {
            data: {
                user: {
                    contributionsCollection: {
                        contributionCalendar: {
                            isHalloween: false,
                            totalContributions: 12,
                            weeks: [],
                        },
                        commitContributionsByRepository: [],
                        totalCommitContributions: 12,
                        totalIssueContributions: 0,
                        totalPullRequestContributions: 0,
                        totalPullRequestReviewContributions: 0,
                        totalRepositoryContributions: 2,
                    },
                    repositories: {
                        edges: [],
                        nodes: [
                            {
                                forkCount: 0,
                                stargazerCount: 0,
                                languages: {
                                    totalSize: 100,
                                    edges: [
                                        {
                                            size: 70,
                                            node: {
                                                name: 'TypeScript',
                                                color: '#3178c6',
                                            },
                                        },
                                        {
                                            size: 30,
                                            node: {
                                                name: 'Python',
                                                color: '#3572A5',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                forkCount: 0,
                                stargazerCount: 0,
                                languages: {
                                    totalSize: 50,
                                    edges: [
                                        {
                                            size: 25,
                                            node: {
                                                name: 'TypeScript',
                                                color: '#3178c6',
                                            },
                                        },
                                        {
                                            size: 25,
                                            node: {
                                                name: 'Go',
                                                color: '#00ADD8',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            },
        } as client.ResponseType;

        const userInfo = aggregate.aggregateUserInfo(response);

        expect(userInfo.contributesLanguage).toEqual([
            {
                language: 'TypeScript',
                color: '#3178c6',
                contributions: 95,
            },
            {
                language: 'Python',
                color: '#3572A5',
                contributions: 30,
            },
            {
                language: 'Go',
                color: '#00ADD8',
                contributions: 25,
            },
        ]);
        expect(userInfo.totalLanguageSize).toEqual(150);
    });
});
