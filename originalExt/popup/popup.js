(() => {
  /*
  Monte Carlo and Probability cones idea:
    * https://kjtradingsystems.com/monte-carlo-probability-cones.html

  Plots are built with plotly
  https://plotly.com/javascript/

  Other libraries that might work/help
    * https://github.com/ranaroussi/quantstats
    * https://pyfolio.ml4trading.io/
    * https://riskfolio-lib.readthedocs.io/en/latest/index.html
*/

  const DATE_KEY = ['Date/Time'];
  const PROFIT_KEY_1 = ['Profit USDT'];
  const PROFIT_KEY_2 = ['Profit USD'];
  const PROFIT_PCT_KEY = ['Cum. Profit %'];

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
  }

  function dedupe(arr, key = 'Trade #') {
    const map = new Map();
    arr.forEach((obj) => map.set(obj[key], obj));
    return Array.from(map.values());
  }

  function averageOfArrays(arrays) {
    const length = arrays[0].length;
    if (!arrays.every((arr) => arr.length === length)) {
      throw new Error('All arrays must have the same length.');
    }
    return Array.from({ length }, (_, i) => {
      const sum = arrays.reduce((acc, arr) => acc + arr[i], 0);
      return sum / arrays.length;
    });
  }

  function mean(array) {
    return array.reduce((a, b) => a + b) / array.length;
  }

  function median(arr) {
    const mid = Math.floor(arr.length / 2);
    const sortedArr = [...arr].sort((a, b) => a - b);

    if (arr.length % 2 === 0) {
      return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
    } else {
      return sortedArr[mid];
    }
  }

  function standardDeviation(array) {
    const n = array.length;
    const _mean = mean(array);
    return Math.sqrt(
      array.map((x) => Math.pow(x - _mean, 2)).reduce((a, b) => a + b) / n
    );
  }

  function getPercentLog(array) {
    const logData = [];
    array.forEach((v, i) => {
      if (array[i - 1] === undefined) {
        return;
      }
      logData.push(Math.log(Math.abs(array[i] / array[i - 1])));
    });
    return logData;
  }

  function netProfitData(profitData) {
    return profitData.reduce(
      (acc, profit, i) => {
        acc.push(acc[i] + profit);
        return acc;
      },
      [0]
    );
  }

  function getEquityData(startingEquity, profitData) {
    return profitData.reduce(
      (acc, profit, i) => {
        acc.push(acc[i] + profit);
        return acc;
      },
      [startingEquity]
    );
  }

  function cumulativeProfits(trades) {
    const profitMap = {
      daily: {},
      weekly: {},
      monthly: {},
    };

    // Helper function to get the ISO week number
    function getWeekNumber(d) {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
      return weekNo < 10 ? `0${weekNo}` : weekNo;
    }

    trades.forEach((trade) => {
      const date = new Date(trade[DATE_KEY]);
      const day = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const week = `${date.getUTCFullYear()}-W${getWeekNumber(date)}`; // Format: YYYY-WXX
      const month = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`; // Format: YYYY-MM

      // Aggregate daily profits
      profitMap.daily[day] =
        (profitMap.daily[day] || 0) + trade[PROFIT_PCT_KEY];

      // Aggregate weekly profits
      profitMap.weekly[week] =
        (profitMap.weekly[week] || 0) + trade[PROFIT_PCT_KEY];

      // Aggregate monthly profits
      profitMap.monthly[month] =
        (profitMap.monthly[month] || 0) + trade[PROFIT_PCT_KEY];
    });

    return profitMap;
  }

  function formatMonteCarloData(simulation, name, params = {}) {
    return {
      name: name,
      type: 'scatter',
      x: simulation.map((equity, i) => i),
      y: simulation,
      ...params,
    };
  }

  function getDrawdown(equityCurve) {
    // Maximum Drawdown (MDD) = (Trough Value – Peak Value) ÷ Peak Value
    // https://youtu.be/tXUrvH1T19o?si=8oDGpo1WeaO06yhU
    return equityCurve.reduce(
      ({ maxEquity, maxDrawdown, maxDrawdownPercent }, equity) => {
        maxEquity = Math.max(maxEquity, equity);
        const dd = maxEquity - equity;
        maxDrawdown = Math.max(maxDrawdown, dd);
        maxDrawdownPercent = (maxDrawdown / maxEquity) * 100;
        return { maxEquity, maxDrawdown, maxDrawdownPercent };
      },
      { maxEquity: -Infinity, maxDrawdown: 0, maxDrawdownPercent: 0 }
    );
  }

  const trial = (points, startingEquity, profitData) => {
    // console.log({points, startingEquity, profitData})
    let equity = startingEquity;
    let simulation = [equity];
    for (let point = 0; point < points; point++) {
      let tradeNo = getRandomInt(0, profitData.length);
      let nextProfit = profitData[tradeNo];
      equity += nextProfit;
      simulation.push(equity);
    }
    return simulation;
  };

  // sampling with replacement
  const monteCarlo = (
    runs = 10,
    points = 10,
    startingEquity = 100,
    profitData
  ) => {
    let simulations = [];
    for (let run = 0; run < runs; run++) {
      let simulation = trial(points, startingEquity, profitData);
      simulations.push(simulation);
    }
    return simulations;
  };

  const runSimulations = ({ runs, points, startingEquity, profitData }) => {
    const simulations = monteCarlo(runs, points, startingEquity, profitData);
    return simulations;
  };

  const renderMonteCarlo = ({ simulations }) => {
    const data = simulations.map((simulation, i) =>
      formatMonteCarloData(simulation, `simulation${i + 1}`)
    );
    const averageMonteCarlo = averageOfArrays(simulations);
    const avg = formatMonteCarloData(averageMonteCarlo, 'average', {
      line: {
        color: 'rgb(0, 0, 0)',
        width: 3,
      },
    });
    // Plotly.newPlot("monte-carlo", [avg, ...data]);
    Plotly.newPlot('monte-carlo', [...data, avg]);
  };

  const renderStats = ({ simulations, startingEquity, profitData }) => {
    const maxDD = Math.max(
      ...simulations.map((simulation) => getDrawdown(simulation).maxDrawdown)
    );
    const maxDDPct = Math.max(
      ...simulations.map(
        (simulation) => getDrawdown(simulation).maxDrawdownPercent
      )
    );

    const equityData = getEquityData(startingEquity, profitData);
    const { maxEquity, maxDrawdown, maxDrawdownPercent } =
      getDrawdown(equityData);

    const results = simulations.reduce(
      (acc, simulation) => {
        const finalEquity = simulation[simulation.length - 1];
        // console.log(finalEquity)
        if (finalEquity > startingEquity) {
          acc.positive++;
        } else {
          acc.negative++;
        }
        if (finalEquity < acc.min) {
          acc.min = finalEquity;
        }
        if (finalEquity > acc.max) {
          acc.max = finalEquity;
        }
        return acc;
      },
      { positive: 0, negative: 0, min: startingEquity, max: startingEquity }
    );
    const average = mean(profitData);
    const med = median(profitData);
    const stdDev = standardDeviation(profitData);
    const maxProfit = Math.max(...profitData);
    const minProfit = Math.min(...profitData);

    document.querySelector(
      '[for="historical-profits"]'
    ).innerText = `Historical Profits (${profitData?.length || 0}):`;
    document.querySelector(
      '#stats-positive'
    ).innerText = `Positive: ${results.positive}`;
    document.querySelector(
      '#stats-negative'
    ).innerText = `Negative: ${results.negative}`;
    document.querySelector(
      '#stats-success'
    ).innerText = `Future success rate: ${+(
      (results.positive / (results.positive + results.negative)) *
      100
    ).toFixed(2)}%`;
    document.querySelector(
      '#stats-max'
    ).innerText = `Max: ${+results.max.toFixed(2)} = ${+(
      (results.max / startingEquity) *
      100
    ).toFixed(2)}%`;
    document.querySelector(
      '#stats-min'
    ).innerText = `Min: ${+results.min.toFixed(2)} = -${+(
      ((startingEquity - results.min) / startingEquity) *
      100
    ).toFixed(2)}%`;
    document.querySelector(
      '#stats-average'
    ).innerText = `Average: ${+average.toFixed(2)}`;
    document.querySelector('#stats-median').innerText = `Median: ${+med.toFixed(
      2
    )}`;
    document.querySelector(
      '#stats-stdev'
    ).innerText = `StDev: ${+stdDev.toFixed(3)}`;
    document.querySelector('#stats-1σ').innerText = `1σ: ${+(
      average + stdDev
    ).toFixed(3)}`;
    document.querySelector('#stats-2σ').innerText = `2σ: ${+(
      average +
      2 * stdDev
    ).toFixed(3)}`;
    document.querySelector(
      '#stats-max-dd'
    ).innerText = `Max DD: ${+maxDD.toFixed(2)} | ${+maxDDPct.toFixed(2)}%`;
    document.querySelector(
      '#stats-dd'
    ).innerText = `DD from inputs: ${+maxDrawdown.toFixed(
      2
    )} | ${+maxDrawdownPercent.toFixed(2)}%`;
    document.querySelector(
      '#stats-return-to-dd'
    ).innerText = `Return/DD from inputs: ${+(maxEquity / maxDrawdown).toFixed(
      2
    )}`;
    document.querySelector(
      '#stats-max-profit'
    ).innerText = `MFE (max profit during a trade): ${+maxProfit.toFixed(2)}`;
    document.querySelector(
      '#stats-max-loss'
    ).innerText = `MAE (max loss during a trade): ${+minProfit.toFixed(2)}`;
    //   TODO: this is max/min profit not max/min during a trade
    document.querySelector('#stats-edge').innerText = `Edge (MFE/MAE > 1): ${+(
      maxProfit / minProfit
    ).toFixed(2)}`;
  };

  const renderProfitData = ({ profitData }) => {
    const data = {
      name: 'Profit Data',
      type: 'scatter',
      x: profitData.map((profit, i) => i),
      y: profitData,
    };
    Plotly.newPlot('profit-data', [data]);
  };

  const renderEquity = ({ startingEquity, profitData }) => {
    const equityData = getEquityData(startingEquity, profitData);
    const data = {
      name: 'equity',
      type: 'scatter',
      x: equityData.map((profit, i) => i),
      y: equityData,
    };
    Plotly.newPlot('equity-plot', [data]);
  };

  const renderProbabilityCones = ({
    startingEquity,
    profitData,
    coneOffset,
    coneLength,
  }) => {
    const applyOffset = (array, offset = coneOffset) => {
      return array.slice(0, array.length - offset);
    };
    const equityData = getEquityData(startingEquity, profitData);
    // const average = mean(profitData);
    const equity = {
      name: 'equity',
      type: 'scatter',
      x: equityData.map((profit, i) => i),
      y: equityData,
    };
    profitData = applyOffset(profitData);
    const average = mean(profitData);
    const linearEquity = {
      name: 'average',
      type: 'scatter',
      x: profitData.map((profit, i) => i),
      y: profitData.reduce(
        (acc, profit, i) => {
          acc.push(acc[i] + average);
          return acc;
        },
        [startingEquity]
      ),
    };

    /*
  https://alvarezquanttrading.com/blog/using-probability-cones-to-test-for-strategy-death/
  Future_value = last_value_of_equity + (avg_daily_return*period + sqrt(period)*(curve_sd*std_equity)

  Where:

  Last_value_of_equity: The last value of your backtested results. This is also the last value of your linear equity curve on the last day of your backtested results.

  Avg_daily_return: This is the average of the natural log of the daily percent returns

  Period: How many days from the last_value_equity that we want to calculate the curve value for

  Curve_sd: For what standard deviation are we calculating the curve for. Typical values are -2, -1, 1, 2.

  Std_equity: This is the standard deviation of the log of daily returns
  */
    const last_value_of_equity = equityData[equityData.length - 1];
    // const logReturns = getPercentLog(equityData);
    const avg_daily_return = average;
    const period = 1;
    const curve_sd = 1;
    const std_equity = standardDeviation(profitData);

    // const last_value_of_equity = netProfit[netProfit-1]
    // const logReturns = getPercentLog(profitData)
    // const avg_daily_return = mean(logReturns)
    // const period = 1;
    // const curve_sd = 1;
    // // const std_equity = standardDeviation(profitData.map(d => Math.log(d)))
    // const std_equity = standardDeviation(logReturns)
    // const fv = last_value_of_equity + (avg_daily_return*period + Math.sqrt(period)*(curve_sd*std_equity))

    const probabilityConeUpA = [];
    const probabilityConeDownA = [];
    const probabilityConeUpB = [];
    const probabilityConeDownB = [];
    const initalConeIndex = equityData.length - 1 - coneOffset;

    for (let period = 1; period < coneLength; period++) {
      const fvUpA =
        last_value_of_equity +
        (avg_daily_return * period +
          Math.sqrt(period) * (curve_sd * std_equity));
      probabilityConeUpA.push(fvUpA);
      const fvDownA =
        last_value_of_equity +
        (avg_daily_return * period +
          Math.sqrt(period) * (-curve_sd * std_equity));
      probabilityConeDownA.push(fvDownA);
      const fvUpB =
        last_value_of_equity +
        (avg_daily_return * period + Math.sqrt(period) * (2 * std_equity));
      probabilityConeUpB.push(fvUpB);
      const fvDownB =
        last_value_of_equity +
        (avg_daily_return * period + Math.sqrt(period) * (-2 * std_equity));
      probabilityConeDownB.push(fvDownB);
    }

    const probabilityConeUpAData = {
      name: 'probability-cone-up-a',
      type: 'scatter',
      x: probabilityConeUpA.map((cone, i) => initalConeIndex + i),
      y: probabilityConeUpA,
    };
    const probabilityConeDownAData = {
      name: 'probability-cone-down-a',
      type: 'scatter',
      x: probabilityConeDownA.map((cone, i) => initalConeIndex + i),
      y: probabilityConeDownA,
    };
    const probabilityConeUpBData = {
      name: 'probability-cone-up-b',
      type: 'scatter',
      x: probabilityConeUpB.map((cone, i) => initalConeIndex + i),
      y: probabilityConeUpB,
    };
    const probabilityConeDownBData = {
      name: 'probability-cone-down-b',
      type: 'scatter',
      x: probabilityConeDownB.map((cone, i) => initalConeIndex + i),
      y: probabilityConeDownB,
    };

    Plotly.newPlot('probability-cones', [
      equity,
      linearEquity,
      probabilityConeUpAData,
      probabilityConeDownAData,
      probabilityConeUpBData,
      probabilityConeDownBData,
    ]);
  };

  const renderNetProfit = ({ startingEquity, profitData }) => {
    const netProfit = netProfitData(profitData);
    const average = mean(profitData);
    const profit = {
      name: 'net-profit',
      type: 'scatter',
      x: netProfit.map((profit, i) => i),
      y: netProfit,
    };
    const linearProfit = {
      name: 'average',
      type: 'scatter',
      x: profitData.map((profit, i) => i),
      y: profitData.reduce(
        (acc, profit, i) => {
          acc.push(acc[i] + average);
          return acc;
        },
        [0]
      ),
    };

    /*
  https://alvarezquanttrading.com/blog/using-probability-cones-to-test-for-strategy-death/
  Future_value = last_value_of_equity + (avg_daily_return*period + sqrt(period)*(curve_sd*std_equity)

  Where:

  Last_value_of_equity: The last value of your backtested results. This is also the last value of your linear equity curve on the last day of your backtested results.

  Avg_daily_return: This is the average of the natural log of the daily percent returns

  Period: How many days from the last_value_equity that we want to calculate the curve value for

  Curve_sd: For what standard deviation are we calculating the curve for. Typical values are -2, -1, 1, 2.

  Std_equity: This is the standard deviation of the log of daily returns
  */
    // const last_value_of_equity = equityData[equityData.length - 1];
    // const logReturns = getPercentLog(equityData);
    // const avg_daily_return = average;
    // const period = 1;
    // const curve_sd = 1;
    // const std_equity = standardDeviation(profitData);

    const last_value_of_profit = netProfit[netProfit.length - 1];
    // const logReturns = getPercentLog(profitData)
    // const avg_daily_return = mean(logReturns)
    const avg_daily_return = average;
    const period = 1;
    const curve_sd = 1;
    // const std_equity = standardDeviation(profitData.map(d => Math.log(d)))
    // const std_equity = standardDeviation(logReturns)
    const std_equity = standardDeviation(profitData);
    const fv =
      last_value_of_profit +
      (avg_daily_return * period + Math.sqrt(period) * (curve_sd * std_equity));
    // console.log(fv);

    const probabilityConeUpA = [];
    const probabilityConeDownA = [];
    const probabilityConeUpB = [];
    const probabilityConeDownB = [];
    for (let period = 1; period < 300; period++) {
      const fvUpA =
        last_value_of_profit +
        (avg_daily_return * period +
          Math.sqrt(period) * (curve_sd * std_equity));
      probabilityConeUpA.push(fvUpA);
      const fvDownA =
        last_value_of_profit +
        (avg_daily_return * period +
          Math.sqrt(period) * (-curve_sd * std_equity));
      probabilityConeDownA.push(fvDownA);
      const fvUpB =
        last_value_of_profit +
        (avg_daily_return * period + Math.sqrt(period) * (2 * std_equity));
      probabilityConeUpB.push(fvUpB);
      const fvDownB =
        last_value_of_profit +
        (avg_daily_return * period + Math.sqrt(period) * (-2 * std_equity));
      probabilityConeDownB.push(fvDownB);
    }
    const probabilityConeUpAData = {
      name: 'probability-cone-up-a',
      type: 'scatter',
      x: probabilityConeUpA.map((cone, i) => netProfit.length + i),
      y: probabilityConeUpA,
    };
    const probabilityConeDownAData = {
      name: 'probability-cone-down-a',
      type: 'scatter',
      x: probabilityConeDownA.map((cone, i) => netProfit.length + i),
      y: probabilityConeDownA,
    };
    const probabilityConeUpBData = {
      name: 'probability-cone-up-b',
      type: 'scatter',
      x: probabilityConeUpB.map((cone, i) => netProfit.length + i),
      y: probabilityConeUpB,
    };
    const probabilityConeDownBData = {
      name: 'probability-cone-down-b',
      type: 'scatter',
      x: probabilityConeDownB.map((cone, i) => netProfit.length + i),
      y: probabilityConeDownB,
    };

    Plotly.newPlot('net-profit', [
      profit,
      linearProfit,
      probabilityConeUpAData,
      probabilityConeDownAData,
      probabilityConeUpBData,
      probabilityConeDownBData,
    ]);
  };

  const renderProfitDistribution = ({ startingEquity, profitData }) => {
    const equityData = getEquityData(startingEquity, profitData);
    const netProfit = netProfitData(profitData);
    // const trace1 = {
    //   name: 'equity',
    //   y: equityData,
    //   type: 'box'
    // };
    // const trace2 = {
    //   name: 'net profit',
    //   y: netProfit,
    //   type: 'box'
    // };
    const trace3 = {
      name: 'profit',
      y: profitData,
      type: 'box',
    };

    // const data = [trace1, trace2];
    const data = [trace3];
    Plotly.newPlot('profit-distribution', data);

    const profitDistributionHist = {
      x: profitData,
      type: 'histogram',
    };
    Plotly.newPlot('profit-distribution-hist', [profitDistributionHist]);
  };

  const renderRandomPriceDistribution = ({ startingEquity, profitData }) => {
    /*
    TODO: plot histogram of sharpe ratio (or other metric) from random price
      plot sharpe ratio (or other metric) from actual price
      the value from the actual price should be an outlier
  */
    const equityData = getEquityData(startingEquity, profitData);
    const netProfit = netProfitData(profitData);
    var x = [];
    for (var i = 0; i < 500; i++) {
      x[i] = Math.random();
    }

    var trace = {
      x: profitData,
      type: 'histogram',
    };
    var data = [trace];
    /**
     * TODO: Commented the line below to not throw errors when the extention is installed
     */
    // Plotly.newPlot('random-distribution', data);
  };

  const renderParameterFalloff = ({ startingEquity, profitData }) => {
    /*
    TODO: plot 3D surface chart of individual parameters and metric (sharpe ratio, etc...) to
      determine the robustness of the strategy.
      Robustness can also be determined through walkforward testing
  */

    // this require d3 which is added via script in html
    d3.csv(
      'https://raw.githubusercontent.com/plotly/datasets/master/api_docs/mt_bruno_elevation.csv',
      function (err, rows) {
        function unpack(rows, key) {
          return rows.map(function (row) {
            return row[key];
          });
        }

        var z_data = [];
        for (i = 0; i < 24; i++) {
          z_data.push(unpack(rows, i));
        }

        var data = [
          {
            z: z_data,
            type: 'surface',
          },
        ];

        var layout = {
          title: 'Mt Bruno Elevation',
          // autosize: false,
          // width: 500,
          // height: 500,
          // margin: {
          //   l: 65,
          //   r: 50,
          //   b: 65,
          //   t: 90
          // }
        };
        /*
            TODO: Commented the line below to not throw error on when the extention is installed
        */
        // Plotly.newPlot('parameter-falloff', data);
      }
    );
  };

  const renderCumulativeProfits = ({ trades }) => {
    function setupTableHeaders(tableId) {
      const table = document.querySelector(tableId);
      if (!document.querySelector(`${tableId} thead`)) {
        const thead = table.createTHead();
        const row = thead.insertRow();

        const headerTitles = [
          'Year/Month',
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        headerTitles.forEach((title) => {
          const th = document.createElement('th');
          th.textContent = title;
          row.appendChild(th);
        });
      }
    }

    function populateTable(profitData, tableId, dataKey) {
      const table = document.querySelector(tableId);
      const tableBody =
        table.getElementsByTagName('tbody')[0] ||
        table.appendChild(document.createElement('tbody'));

      Object.keys(profitData.monthly).forEach((key) => {
        const [year, month] = key.split('-');

        let row = document.querySelector(`${tableId} tr[data-year="${year}"]`);
        if (!row) {
          row = document.createElement('tr');
          row.setAttribute('data-year', year);
          row.innerHTML = `<td>${year}</td>` + '<td></td>'.repeat(12);
          tableBody.appendChild(row);
        }

        const monthIndex = parseInt(month, 10) - 1; // because months are 0-indexed in JS
        row.cells[monthIndex + 1].textContent =
          profitData.monthly[key].toFixed(2);
      });
    }
    const profitMap = cumulativeProfits(trades);
    // console.log(profitMap)
    setupTableHeaders('#profit-pct-table');
    populateTable(profitMap, '#profit-pct-table', 'pctProfit');
  };

  const renderAll = () => {
    const inputs = getInputs();
    // console.log(inputs)
    const simulations = runSimulations(inputs);
    renderMonteCarlo({ simulations });
    renderStats({ simulations, ...inputs });
    renderProfitData(inputs);
    renderEquity(inputs);
    renderProbabilityCones(inputs);
    renderNetProfit(inputs);
    renderProfitDistribution(inputs);
    renderRandomPriceDistribution(inputs);
    /**
     * TODO: plot 3D surface chart of individual parameters and metric (sharpe ratio, etc...) to
      determine the robustness of the strategy.
     * Robustness can also be determined through walkforward testing
     */
    // renderParameterFalloff(inputs);
  };

  const getInputs = () => {
    const startingEquity = parseFloat(
      document.querySelector('#starting-equity').value,
      10
    );
    const runs = parseInt(document.querySelector('#trial-runs').value, 10);
    const points = parseInt(document.querySelector('#future-points').value, 10);
    const coneOffset = parseInt(
      document.querySelector('#cone-offset').value,
      10
    );
    const coneLength = parseInt(
      document.querySelector('#cone-length').value,
      10
    );
    const profitData = document
      .querySelector('#historical-profits')
      .value?.split('\n')
      ?.map((str) => parseFloat(str.trim(), 10))
      ?.filter((num) => !isNaN(num));
    return { startingEquity, runs, points, profitData, coneOffset, coneLength };
  };

  /*
  TODO: The z-score is the number of standard deviations a value is away from it's mean. It’s a great way to summarize where a value lies on a distribution.

  For example, if you’re 189 cm tall, the z-score of your height might be 2.5. That means you are 2.5 standard deviations away from the mean height of everyone in the distribution.

  The math is simple:

  (value - average value) / standard deviation of values
*/

  document.querySelector('#run-simulations').onclick = (evt) => {
    evt.preventDefault();
    renderAll();
  };

  // default render example
  renderAll();

  document.getElementById('upload').addEventListener('click', () => {
    Papa.parse(document.getElementById('upload-file').files[0], {
      // download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (csv) {
        // console.log(csv.data)
        const data = dedupe(csv.data);
        const historicalProfits = data.map(
          (data) => data[PROFIT_KEY_1] || data[PROFIT_KEY_2]
        );
        document.querySelector('#historical-profits').value =
          historicalProfits.join('\n');
        renderAll();
        renderCumulativeProfits({ trades: data });
      },
    });
  });
})();
