import * as type from './type';

const OTHER_NAME = 'other';
const OTHER_COLOR = '#444444';
const MAX_PIE_LANGUAGES = 8;

export const buildPieLanguages = (
    userInfo: type.UserInfo,
): Array<type.LangInfo> => {
    const languages = userInfo.contributesLanguage.slice(0, MAX_PIE_LANGUAGES);
    const sumContrib = languages
        .map((lang) => lang.contributions)
        .reduce((a, b) => a + b, 0);
    const otherContributions = userInfo.totalContributions - sumContrib;

    if (0 < otherContributions) {
        languages.push({
            language: OTHER_NAME,
            color: OTHER_COLOR,
            contributions: otherContributions,
        });
    }

    return languages;
};
