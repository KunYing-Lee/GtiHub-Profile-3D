import * as client from './github-graphql';
import * as type from './type';

const OTHER_COLOR = '#444444';

const toNumberContributionLevel = (level: type.ContributionLevel): number => {
    switch (level) {
        case 'NONE':
            return 0;
        case 'FIRST_QUARTILE':
            return 1;
        case 'SECOND_QUARTILE':
            return 2;
        case 'THIRD_QUARTILE':
            return 3;
        case 'FOURTH_QUARTILE':
            return 4;
    }
};

const compare = (num1: number, num2: number): number => {
    if (num1 < num2) {
        return -1;
    } else if (num1 > num2) {
        return 1;
    } else {
        return 0;
    }
};

const addLanguageContribution = (
    contributesLanguage: { [language: string]: type.LangInfo },
    language: string,
    color: string | null,
    contributions: number,
): void => {
    if (!language || contributions <= 0) {
        return;
    }

    const info = contributesLanguage[language];
    if (info) {
        info.contributions += contributions;
        return;
    }

    contributesLanguage[language] = {
        language: language,
        color: color || OTHER_COLOR,
        contributions: contributions,
    };
};

export const aggregateUserInfo = (
    response: client.ResponseType,
): type.UserInfo => {
    if (!response.data) {
        if (response.errors && response.errors.length) {
            throw new Error(response.errors[0].message);
        } else {
            throw new Error('JSON\n' + JSON.stringify(response, null, 2));
        }
    }

    const user = response.data.user;
    const calendar = user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .map((week) => ({
            contributionCount: week.contributionCount,
            contributionLevel: toNumberContributionLevel(
                week.contributionLevel,
            ),
            date: new Date(week.date),
        }));
    const contributesLanguage: { [language: string]: type.LangInfo } = {};
    let totalLanguageSize = 0;
    user.repositories.nodes.forEach((repo) => {
        totalLanguageSize += repo.languages?.totalSize || 0;
        repo.languages?.edges
            .filter((edge) => 0 < edge.size && edge.node.name)
            .forEach((edge) => {
                addLanguageContribution(
                    contributesLanguage,
                    edge.node.name,
                    edge.node.color,
                    edge.size,
                );
            });
        });
    const languages: Array<type.LangInfo> = Object.values(
        contributesLanguage,
    ).sort((obj1, obj2) => -compare(obj1.contributions, obj2.contributions));

    const totalForkCount = user.repositories.nodes
        .map((node) => node.forkCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const totalStargazerCount = user.repositories.nodes
        .map((node) => node.stargazerCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const userInfo: type.UserInfo = {
        isHalloween:
            user.contributionsCollection.contributionCalendar.isHalloween,
        contributionCalendar: calendar,
        contributesLanguage: languages,
        totalLanguageSize: totalLanguageSize,
        totalContributions:
            user.contributionsCollection.contributionCalendar
                .totalContributions,
        totalCommitContributions:
            user.contributionsCollection.totalCommitContributions,
        totalIssueContributions:
            user.contributionsCollection.totalIssueContributions,
        totalPullRequestContributions:
            user.contributionsCollection.totalPullRequestContributions,
        totalPullRequestReviewContributions:
            user.contributionsCollection.totalPullRequestReviewContributions,
        totalRepositoryContributions:
            user.contributionsCollection.totalRepositoryContributions,
        totalForkCount: totalForkCount,
        totalStargazerCount: totalStargazerCount,
    };
    return userInfo;
};
