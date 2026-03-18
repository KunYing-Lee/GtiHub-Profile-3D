import * as type from '../src/type';
import { buildPieLanguages } from '../src/pie-language-utils';

describe('pie-language-utils', () => {
    it('shows the top 8 repository languages and groups remaining size as other', () => {
        const userInfo: type.UserInfo = {
            isHalloween: false,
            contributionCalendar: [],
            contributesLanguage: [
                { language: 'A', color: '#111111', contributions: 40 },
                { language: 'B', color: '#222222', contributions: 30 },
                { language: 'C', color: '#333333', contributions: 20 },
                { language: 'D', color: '#444444', contributions: 10 },
                { language: 'E', color: '#555555', contributions: 8 },
                { language: 'F', color: '#666666', contributions: 6 },
                { language: 'G', color: '#777777', contributions: 4 },
                { language: 'H', color: '#888888', contributions: 2 },
                { language: 'I', color: '#999999', contributions: 1 },
            ],
            totalLanguageSize: 121,
            totalContributions: 194,
            totalCommitContributions: 16,
            totalIssueContributions: 0,
            totalPullRequestContributions: 0,
            totalPullRequestReviewContributions: 0,
            totalRepositoryContributions: 9,
            totalForkCount: 0,
            totalStargazerCount: 0,
        };
        const languages = buildPieLanguages(userInfo);

        expect(languages.map((lang) => lang.language)).toEqual([
            'A',
            'B',
            'C',
            'D',
            'E',
            'F',
            'G',
            'H',
            'other',
        ]);
        expect(languages[languages.length - 1].contributions).toEqual(1);
    });
});
