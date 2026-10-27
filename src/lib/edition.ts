// The site is published in two editions from one repository: the live tool,
// from the main branch at the root of the site, and the edition described in
// the doctoral thesis, from the thesis branch at /thesis/. The thesis edition
// receives corrections and translations but no new features. The deploy
// workflow sets these values for each build; a local build is the live edition.
export const edition: 'live' | 'thesis' = import.meta.env.PUBLIC_EDITION === 'thesis' ? 'thesis' : 'live';

/** Root of the other edition, e.g. "/MLProcessMap/thesis/", when both are published. */
export const otherEditionUrl: string | undefined = import.meta.env.PUBLIC_OTHER_EDITION_URL || undefined;
