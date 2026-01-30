type Range<Model, OmitKeys extends keyof Model = never> = Record<Exclude<keyof Model, OmitKeys>, unknown> & Partial<Record<OmitKeys, never>>

export function checkSelect<Model, OmitKeys extends keyof Model = never, Select extends Range<Model, OmitKeys> = Range<Model, OmitKeys>>(select: Select) {}
