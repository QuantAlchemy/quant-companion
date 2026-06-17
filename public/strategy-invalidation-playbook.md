# Strategy Invalidation Playbook

> Canonical HTML version: [/strategy-invalidation-playbook-specs.html](/strategy-invalidation-playbook-specs.html)

A strategy is not valid because the equity curve looks good. It is valid only after the simplest ways to explain it away have failed.

**Null hypothesis:** my signal has no edge. Randomized trades, shuffled labels, market beta, cost assumptions, or one lucky regime can explain the result.

**Fresh example for Quant Companion:** use a simple public TradingView export, such as an RSI pullback strategy on SPY, QQQ, BTCUSD, or ES. Do not copy the PQN crack-spread/vectorbt examples exactly; use PQN as the implementation reference library and build a new, Quant Alchemy-owned example.

## Version scope

- **v1 implemented in app:** TradingView List of Trades export tests: baseline, sample size, trade-order shuffle, bootstrap, sign-flip expectancy, outlier dependency, fee haircut, subperiod stability, rolling death watch, and multi-file comparison.
- **v1.1 / v2:** OHLC price import and richer multiple-result comparison. Multiple TradingView result files are already supported by upload; the new lab begins using them.
- **v3 options:** strategy signal export, TradingView Optimizer/browser automation for reruns, and Pine Script controlled randomization.

## Test format

Every invalidation test should be documented with:

- Name
- What it checks
- How to run it
- Required inputs
- Metrics to compare
- Pass condition
- Fail / invalidate condition
- Example
- Python/VectorBT/Zipline implementation notes

---

## 1. Baseline freeze

- **Name:** Baseline freeze
- **What it checks:** Whether the imported backtest can be reproduced before any stress testing or randomization is trusted.
- **How to run it:** Export TradingView Strategy Tester → List of Trades, upload into Quant Companion, set starting equity, and record market, timeframe, date range, settings, fees, slippage, sizing, pyramiding, and session assumptions.
- **Required inputs:** TradingView List of Trades CSV/XLSX; starting equity; strategy settings notes.
- **Metrics to compare:** trade count, net profit, win rate, average trade, median trade, max drawdown, MAR, Sharpe ratio.
- **Pass condition:** Re-importing the same export produces the same baseline metrics.
- **Fail / invalidate condition:** The export cannot be reproduced, required fields are missing, or the headline stats depend on an undocumented setting.
- **Example:** `03 Jumpstart/03_jumpstart_backtest.ipynb` and `04 Jumpstart/04_jumpstart_performance.ipynb` establish baseline backtest/performance measurement before optimization.
- **Python/VectorBT/Zipline implementation notes:** Load the trade list into pandas, normalize dates/profits, freeze config in a JSON sidecar, and assert repeatable summary stats before running any additional test.

## 2. Trade count sanity

- **Name:** Trade count sanity
- **What it checks:** Whether there are enough observations for any statistical claim to matter.
- **How to run it:** Count completed trades and inspect wins/losses and date coverage after import.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** total trades, winning trades, losing trades, years/months covered, average hold time if entry/exit dates exist.
- **Pass condition:** 100+ trades across a meaningful date range.
- **Fail / invalidate condition:** Fewer than 30 trades, or nearly all trades come from one cluster/regime.
- **Example:** `04 Jumpstart/04_jumpstart_performance.ipynb` uses performance summaries where sample size directly affects confidence.
- **Python/VectorBT/Zipline implementation notes:** Use pandas groupby/date counts; in VectorBT inspect `portfolio.trades.count()`; in Zipline aggregate transactions/orders by period.

## 3. Cost assumption audit

- **Name:** Cost assumption audit
- **What it checks:** Whether edge exists only under impossible friction assumptions.
- **How to run it:** Record commission, slippage, order sizing, pyramiding, margin, fill model, and session settings from TradingView. Recompute simple per-trade fee haircut in Quant Companion.
- **Required inputs:** TradingView export plus manual strategy settings. Price/size data improves slippage modeling.
- **Metrics to compare:** original net profit, fee-adjusted net profit, fee-adjusted expectancy, break-even fee per trade.
- **Pass condition:** Realistic costs leave expectancy comfortably positive.
- **Fail / invalidate condition:** Profit disappears under reasonable fees/slippage or requires perfect fills.
- **Example:** `Module 7/01 Zipline Reloaded Tutorial.ipynb` demonstrates explicit commission/slippage modeling in an event-driven backtest.
- **Python/VectorBT/Zipline implementation notes:** In pandas subtract fixed or bps fees per completed trade. In VectorBT set fees/slippage on portfolio construction. In Zipline configure commission and slippage models.

## 4. Trade-order shuffle

- **Name:** Trade-order shuffle
- **What it checks:** Whether the realized trade sequence is unusually fragile compared with the same trades in random order.
- **How to run it:** Randomly reorder realized trade profits 500–5,000 times, rebuild equity curves, and compare drawdown distribution.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** baseline max drawdown percentile, median shuffled max drawdown, 95th percentile shuffled max drawdown.
- **Pass condition:** Baseline drawdown is better than the median shuffled path.
- **Fail / invalidate condition:** Baseline drawdown lands in the worst quartile of shuffled paths.
- **Example:** `Module 4/Module 4/Treat Your Backtest Like an Experiment.ipynb` is the conceptual match: treat the result as an experiment and compare to randomized alternatives.
- **Python/VectorBT/Zipline implementation notes:** In pandas use `np.random.permutation(profits)` and cumulative sum. VectorBT can construct synthetic return paths. Zipline is unnecessary for this trade-list-only test.

## 5. Trade bootstrap

- **Name:** Trade bootstrap
- **What it checks:** Whether the observed trade distribution survives sampling with replacement.
- **How to run it:** Sample N trades with replacement from the N observed trades, repeat hundreds/thousands of times, and build terminal profit/drawdown distributions.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** probability of loss, 5th percentile terminal profit, median terminal profit, 95th percentile drawdown.
- **Pass condition:** Probability of loss is low and the left tail remains acceptable.
- **Fail / invalidate condition:** A large share of bootstraps lose money or exceed acceptable drawdown.
- **Example:** `04 Jumpstart/04_jumpstart_performance.ipynb` and the experiment framing in Module 4 are the reference pattern.
- **Python/VectorBT/Zipline implementation notes:** Use pandas/numpy `rng.choice(profits, size=n, replace=True)`. Quant Companion already has Monte Carlo machinery; v1 reframes it as an invalidation test.

## 6. Sign-flip expectancy

- **Name:** Sign-flip expectancy
- **What it checks:** Whether realized win/loss direction matters after preserving trade magnitude.
- **How to run it:** Convert each trade to `abs(P/L)`, randomly assign positive/negative signs, repeat many times, and compare original total profit to the random-sign distribution.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** empirical p-value, original profit percentile, random-sign median profit.
- **Pass condition:** Original total profit is a strong right-tail outlier, e.g. empirical p-value ≤ 0.05.
- **Fail / invalidate condition:** Random signs can frequently match or exceed the original result.
- **Example:** `Module 4/Module 4/Treat Your Backtest Like an Experiment.ipynb`; factor-label shuffle ideas also connect to `Module 5/03 Assessing a market inefficiency based on volatility.ipynb`.
- **Python/VectorBT/Zipline implementation notes:** In pandas use `np.abs(profits) * rng.choice([-1, 1], size=n)`; calculate `p = (1 + random_runs >= real) / (1 + runs)`.

## 7. Random entry timing

- **Name:** Random entry timing
- **What it checks:** Whether the actual signal timing beats random entries on the same market path.
- **How to run it:** Preserve trade count and holding-period distribution, randomize entry dates on the same OHLC series, simulate exits after equivalent holds, and compare results.
- **Required inputs:** OHLC price data; trade count; holding-period distribution; direction/sizing assumptions.
- **Metrics to compare:** original return, Sharpe, max drawdown, win rate, expectancy versus random-entry distribution.
- **Pass condition:** Original strategy is a strong outlier versus random entries.
- **Fail / invalidate condition:** Random entries produce similar or better performance.
- **Example:** `day6-backtest.ipynb`, `day6-crack-spread.ipynb`, and Module 6 VectorBT notebooks show strategy simulations against price data.
- **Python/VectorBT/Zipline implementation notes:** Requires OHLC import. In VectorBT, generate random entry masks and use the same exit/hold logic. In Zipline, create random scheduled orders over historical bars.

## 8. Circular signal shift

- **Name:** Circular signal shift
- **What it checks:** Whether signal timing matters after preserving signal clustering/autocorrelation.
- **How to run it:** Shift the full signal series by random offsets, rerun the strategy, and compare shifted performance to real performance.
- **Required inputs:** Signal series or reproducible strategy code plus OHLC data.
- **Metrics to compare:** original Sharpe/return/drawdown percentile versus shifted-signal runs.
- **Pass condition:** Original timing is a strong outlier.
- **Fail / invalidate condition:** Shifted signals perform similarly.
- **Example:** Module 6 VectorBT optimization notebooks provide the closest implementation surface for mask-based signal experiments.
- **Python/VectorBT/Zipline implementation notes:** VectorBT is ideal: use `np.roll(entries, shift)` and rebuild portfolios. Zipline can replay shifted signals but is heavier.

## 9. Randomized settings rerun

- **Name:** Randomized settings rerun
- **What it checks:** Whether chosen parameters sit on a robust plateau or a cherry-picked spike.
- **How to run it:** Run random or grid parameter sets, compare the selected parameter to the distribution and local neighborhood.
- **Required inputs:** Strategy code or repeated TradingView exports from different settings. Multiple uploaded result files can approximate this if each file represents a settings run.
- **Metrics to compare:** selected setting percentile, plateau width, neighbor degradation, out-of-sample performance.
- **Pass condition:** Selected settings are part of a broad robust plateau.
- **Fail / invalidate condition:** The selected setting is an isolated spike.
- **Example:** `Module 6/Prototyping and Optimizing Strategies with VectorBT.ipynb` and `Module 6/Optimize with Surface Plot.ipynb`.
- **Python/VectorBT/Zipline implementation notes:** VectorBT parameter broadcasting is the best fit. Zipline reruns are slower but possible. TradingView Optimizer/browser automation may become the v3 path.

## 10. Remove best trades / outlier dependency

- **Name:** Remove best trades / outlier dependency
- **What it checks:** Whether the strategy is just one or two lucky trades wearing a trench coat.
- **How to run it:** Remove the top 1 winner, top 5 winners, and top 10% of winners, then recompute net profit and expectancy.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** top trade contribution, profit after top 5 winners removed, profit after top 10% winners removed.
- **Pass condition:** Strategy remains profitable after removing top 10% of winning trades.
- **Fail / invalidate condition:** One trade dominates or removing top winners turns net profit negative.
- **Example:** `04 Jumpstart/04_jumpstart_performance.ipynb` performance decomposition; the concept fits any P/L series.
- **Python/VectorBT/Zipline implementation notes:** Sort trade P/L descending in pandas and recompute summary stats after dropping top rows. Quant Companion already had best/worst removal controls; v1 formalizes the test.

## 11. Fee haircut

- **Name:** Fee haircut
- **What it checks:** Whether fixed transaction costs erase the trade-level edge.
- **How to run it:** Subtract a fixed assumed fee from every completed trade and recompute total profit/expectancy.
- **Required inputs:** TradingView export plus fee assumption.
- **Metrics to compare:** fee-adjusted net profit, fee-adjusted expectancy, percent of original edge retained.
- **Pass condition:** Fee-adjusted profit remains comfortably positive.
- **Fail / invalidate condition:** Reasonable fees erase expectancy.
- **Example:** Zipline commission/slippage examples in `Module 7/01 Zipline Reloaded Tutorial.ipynb`.
- **Python/VectorBT/Zipline implementation notes:** For trade-list tests, subtract directly from P/L. For VectorBT/Zipline, model commission at the order level.

## 12. Slippage haircut

- **Name:** Slippage haircut
- **What it checks:** Whether the edge requires perfect fills.
- **How to run it:** Subtract slippage per share/contract or bps of notional from each trade.
- **Required inputs:** Price/size/notional per trade; better with OHLC or intrabar data.
- **Metrics to compare:** slippage-adjusted net profit, adjusted drawdown, break-even slippage.
- **Pass condition:** Edge survives realistic slippage assumptions.
- **Fail / invalidate condition:** Small slippage turns the system negative.
- **Example:** Zipline slippage modeling in Module 7.
- **Python/VectorBT/Zipline implementation notes:** VectorBT supports slippage inputs; Zipline supports slippage models. From a TradingView export, fixed or percent haircut is only an approximation unless quantity/notional is reliable.

## 13. Benchmark overlay

- **Name:** Benchmark overlay
- **What it checks:** Whether the strategy adds value beyond passive exposure.
- **How to run it:** Compare equity curve to buy-and-hold SPY/QQQ, sector ETF, or the underlying market over the same dates.
- **Required inputs:** Strategy equity/trade dates plus benchmark OHLC/returns.
- **Metrics to compare:** total return, max drawdown, Sharpe, MAR, correlation, beta proxy.
- **Pass condition:** Strategy improves risk-adjusted return or drawdown versus the benchmark.
- **Fail / invalidate condition:** Complexity adds no improvement over passive exposure.
- **Example:** `Module 5/02 Use regression to find and hedge beta.ipynb` and `Module 7/02 Backtesting Factor Portfolios with Zipline Reloaded.ipynb`.
- **Python/VectorBT/Zipline implementation notes:** Use pandas to align strategy equity returns with benchmark returns. VectorBT can construct benchmark portfolios. Zipline can run benchmark/factor comparisons.

## 14. Regression alpha

- **Name:** Regression alpha
- **What it checks:** Whether returns are alpha or explained by market/factor beta.
- **How to run it:** Regress strategy returns against benchmark or factor returns.
- **Required inputs:** Strategy periodic returns and benchmark/factor returns.
- **Metrics to compare:** alpha, beta, t-stat/p-value, R², residual drawdown.
- **Pass condition:** Alpha is positive and meaningful after beta adjustment.
- **Fail / invalidate condition:** Beta explains the result or alpha is insignificant.
- **Example:** `Module 5/02 Use regression to find and hedge beta.ipynb` and `Module 5/02 regression assignment use spy factor out mag7.ipynb`.
- **Python/VectorBT/Zipline implementation notes:** Use statsmodels/OLS in pandas. VectorBT can export return series. Zipline factor outputs can be aligned to benchmark returns.

## 15. Forward-label shuffle

- **Name:** Forward-label shuffle
- **What it checks:** Whether factor/signal values predict forward returns better than shuffled labels.
- **How to run it:** Pair signal/factor values with forward returns, shuffle forward returns, and compare information coefficient or strategy result to shuffled distribution.
- **Required inputs:** Signal/factor series and forward returns.
- **Metrics to compare:** Spearman/Pearson IC, p-value, hit rate, realized return by factor bucket.
- **Pass condition:** Real factor relationship is stronger than shuffled labels.
- **Fail / invalidate condition:** Shuffled labels produce similar IC/performance.
- **Example:** `Module 5/03 Assessing a market inefficiency based on volatility.ipynb` uses factor/inefficiency testing concepts.
- **Python/VectorBT/Zipline implementation notes:** Use scipy/statsmodels for rank correlation. VectorBT can convert factor masks to entries. Zipline/Alphalens-style factor testing fits here.

## 16. Subperiod split

- **Name:** Subperiod split
- **What it checks:** Whether returns survive across years/quarters/regimes.
- **How to run it:** Group trades by exit year/quarter/month and recompute net profit, drawdown, and expectancy for each period.
- **Required inputs:** TradingView List of Trades export with dates.
- **Metrics to compare:** profitable period ratio, largest period contribution, worst period profit.
- **Pass condition:** Most periods are profitable and no single period explains most profit.
- **Fail / invalidate condition:** One subperiod explains nearly all returns or most periods lose money.
- **Example:** `04 Jumpstart/04_jumpstart_performance.ipynb` and Module 4 experiment framing.
- **Python/VectorBT/Zipline implementation notes:** Use pandas `Grouper` by exit date. VectorBT/Zipline can slice portfolios by date ranges.

## 17. Rolling death watch

- **Name:** Rolling death watch
- **What it checks:** Whether the edge decays or has long dead zones.
- **How to run it:** Compute rolling N-trade net profit, rolling win rate, and rolling drawdown proxies.
- **Required inputs:** TradingView List of Trades export.
- **Metrics to compare:** percent of negative rolling windows, worst rolling window, recent rolling window versus historical distribution.
- **Pass condition:** Rolling windows mostly stay positive and recent performance is not collapsing.
- **Fail / invalidate condition:** More than half of rolling windows are negative or recent windows are in the left tail.
- **Example:** Rolling statistics ideas appear across the performance notebooks; use Module 4’s experiment discipline.
- **Python/VectorBT/Zipline implementation notes:** Use pandas `.rolling(window).sum()` on trade P/L. For return series use rolling Sharpe/drawdown.

## 18. Walk-forward comparison

- **Name:** Walk-forward comparison
- **What it checks:** Whether optimized settings transfer out of sample.
- **How to run it:** Optimize on period A, freeze settings, test period B, then roll forward.
- **Required inputs:** Strategy code or repeated TradingView result files by train/test period.
- **Metrics to compare:** in-sample versus out-of-sample net profit, Sharpe, drawdown, degradation ratio.
- **Pass condition:** Out-of-sample performance remains acceptable without re-optimization.
- **Fail / invalidate condition:** In-sample settings do not transfer or collapse immediately out of sample.
- **Example:** Module 6 VectorBT optimization notebooks and Module 7 Zipline backtests.
- **Python/VectorBT/Zipline implementation notes:** VectorBT can optimize across parameter grids and slice train/test periods. Zipline can rerun fixed settings over separate date ranges. Multiple TradingView exports can approximate this manually.

---

## Implementation links

- In app: `/#strategy-invalidation-lab`
- Static playbook: `/strategy-invalidation-playbook.html`
- Full documentation: `/strategy-invalidation-playbook-specs.html`
