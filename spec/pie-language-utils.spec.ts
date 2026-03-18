import * as aggregate from '../src/aggregate-user-info';
import { buildPieLanguages } from '../src/pie-language-utils';
import { dummyData } from './dummy-data';

describe('pie-language-utils', () => {
    it('shows the top 8 languages and groups the rest as other', () => {
        const userInfo = aggregate.aggregateUserInfo(dummyData);
        const languages = buildPieLanguages(userInfo);

        expect(languages.map((lang) => lang.language)).toEqual([
            'Jupyter Notebook',
            'Perl',
            'Kotlin',
            'TypeScript',
            'Java',
            'Go',
            'Python',
            'JavaScript',
            'other',
        ]);
        expect(languages[languages.length - 1].contributions).toEqual(9);
    });
});
