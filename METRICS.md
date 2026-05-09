# Metrics

The North Star metric is **qualified savings dollars discovered per week**. This is better than daily active users because AI spend audits are not a daily habit. The product wins when it repeatedly surfaces credible, large savings opportunities that Credex can help capture.

Three input metrics drive it. First, audit completion rate: if users start but do not finish, the form is too slow or confusing. Second, high-savings rate: the percentage of completed audits above $500/month in potential savings. Third, report capture rate after value is shown: if users see savings but do not leave an email, the report may not feel trustworthy or useful enough.

I would instrument `audit_started`, `tool_added`, `audit_completed`, `summary_generated`, `share_url_copied`, `lead_submitted`, and `consult_clicked`. I would also log anonymized savings bands and primary use case so Credex can learn which segments produce real opportunities.

A pivot trigger: after 500 completed audits, if fewer than 5% are high-savings and fewer than 15% of high-savings users submit email, the tool is probably either attracting the wrong audience or not presenting enough trust. The first pivot would be narrower positioning around “AI API bill audit for seed-stage engineering teams” instead of broad AI tool spend.
