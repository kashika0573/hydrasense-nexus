function formatAPIDate(dateString) {
  const parts = dateString.split("/");
  if (parts.length !== 3) return dateString;

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const month = monthNames[Number(parts[0]) - 1] || parts[0];
  const year = `20${parts[2]}`;

  return `${month} ${year}`;
}

function convertAPIRecordToLocation(record, index, previousRecord) {
  const snowpackPercent = cleanNumber(record.Snowpack);
  const precipPercent = cleanNumber(record.Precip);
  const reservoirPercent = cleanNumber(record.Reservoir);

  const currentLocation = {
    snowpack: clamp(snowpackPercent, 0, 100) / 100,
    rainfall: clamp(precipPercent, 0, 100) / 100,
    reservoir: clamp(reservoirPercent, 0, 100) / 100
  };

  let trend = -1;

  if (previousRecord) {
    const previousLocation = {
      snowpack: clamp(cleanNumber(previousRecord.Snowpack), 0, 100) / 100,
      rainfall: clamp(cleanNumber(previousRecord.Precip), 0, 100) / 100,
      reservoir: clamp(cleanNumber(previousRecord.Reservoir), 0, 100) / 100
    };

    const currentWAI = calculateWAI(currentLocation);
    const previousWAI = calculateWAI(previousLocation);

    trend = currentWAI - previousWAI;
  }

  const prettyDate = formatAPIDate(record.Date);
  const fakeTemperature = index === 0 ? 94 : index === 1 ? 91 : index === 2 ? 88 : 86;

  return {
    name: prettyDate,
    date: record.Date,
    snowpack: currentLocation.snowpack,
    rainfall: currentLocation.rainfall,
    reservoir: currentLocation.reservoir,
    rawSnowpack: snowpackPercent,
    rawPrecip: precipPercent,
    rawReservoir: reservoirPercent,
    temp: fakeTemperature,
    trend: trend,
    insight: `Live H2O Hackathon API data for ${prettyDate}: snowpack is ${snowpackPercent}%, precipitation is ${precipPercent}%, and reservoir level is ${reservoirPercent}%. These values are converted into a clean 0–100 Water Availability Index.`
  };
}
