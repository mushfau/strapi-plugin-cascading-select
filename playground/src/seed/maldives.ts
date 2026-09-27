import type { Core } from '@strapi/strapi';

/**
 * Sample of Maldivian administrative atolls and inhabited islands for local testing.
 * Includes duplicate island names across atolls (Feydhoo, Gan) on purpose.
 */
const ATOLLS: Array<{ name: string; code: string; islands: string[] }> = [
  { name: 'Kaafu', code: 'K', islands: ['Maafushi', 'Guraidhoo', 'Thulusdhoo', 'Himmafushi', 'Huraa', 'Dhiffushi'] },
  { name: 'Alifu Alifu', code: 'AA', islands: ['Rasdhoo', 'Ukulhas', 'Thoddoo', 'Mathiveri', 'Bodufolhudhoo'] },
  { name: 'Shaviyani', code: 'Sh', islands: ['Funadhoo', 'Milandhoo', 'Komandoo', 'Feydhoo'] },
  { name: 'Laamu', code: 'L', islands: ['Fonadhoo', 'Gan', 'Isdhoo', 'Maamendhoo'] },
  { name: 'Gaafu Dhaalu', code: 'GDh', islands: ['Thinadhoo', 'Gadhdhoo', 'Madaveli', 'Fiyoaree'] },
  { name: 'Seenu', code: 'S', islands: ['Hithadhoo', 'Maradhoo', 'Feydhoo', 'Meedhoo', 'Hulhudhoo', 'Gan'] },
];

export const seedMaldives = async (strapi: Core.Strapi) => {
  if ((await strapi.documents('api::atoll.atoll').count({})) > 0) {
    return;
  }

  for (const { name, code, islands } of ATOLLS) {
    const atoll = await strapi.documents('api::atoll.atoll').create({ data: { name, code } });

    for (const island of islands) {
      await strapi.documents('api::island.island').create({
        data: { name: island, atoll: atoll.documentId },
      });
    }
  }

  strapi.log.info(`Seeded ${ATOLLS.length} atolls`);
};
