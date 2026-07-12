// URL: /company/{法人番号}-{slug}(§11)
export function companyPath(c: { corporateNumber: string; slug: string }): string {
  return `/company/${c.corporateNumber}-${c.slug}`;
}

// パラメータ "{法人番号}-{slug}" から法人番号を取り出す。
export function parseCompanyParam(param: string): string {
  // 法人番号は先頭の連続数字部分
  const m = param.match(/^(\d+)/);
  return m ? m[1] : param;
}
