#!/bin/bash
# Scrape European cities via Yelp - targeting ~200 total businesses
# Priority cities get higher limits

cd "$(dirname "$0")/.."

CITIES_P1=("London" "Berlin" "Paris" "Stockholm" "Amsterdam" "Vienna")
CITIES_P2=("Munich" "Frankfurt" "Hamburg" "Manchester" "Birmingham" "Gothenburg" "Lyon" "Marseille" "Rotterdam" "The Hague" "Zurich" "Geneva" "Brussels" "Copenhagen" "Oslo" "Milan" "Rome" "Madrid" "Barcelona")
CITIES_P3=("Cologne" "Dusseldorf" "Stuttgart" "Hannover" "Bonn" "Nuremberg" "Leeds" "Glasgow" "Bristol" "Liverpool" "Newcastle" "Uppsala" "Malmo" "Linkoping" "Toulouse" "Nice" "Utrecht" "Eindhoven" "Salzburg" "Graz" "Linz" "Turin" "Bologna" "Valencia" "Bergen" "Trondheim" "Aarhus" "Odense" "Antwerp" "Ghent" "Bern" "Basel")

TOTAL=0
TARGET=200

for city in "${CITIES_P1[@]}"; do
  if [ $TOTAL -ge $TARGET ]; then break; fi
  echo ""
  echo "=========================================="
  echo "  Scraping $city (P1, limit 15)"
  echo "=========================================="
  npx tsx scripts/scrape.ts --city "$city" --source yelp --limit 15
  TOTAL=$((TOTAL + 15))
done

for city in "${CITIES_P2[@]}"; do
  if [ $TOTAL -ge $TARGET ]; then break; fi
  echo ""
  echo "=========================================="
  echo "  Scraping $city (P2, limit 8)"
  echo "=========================================="
  npx tsx scripts/scrape.ts --city "$city" --source yelp --limit 8
  TOTAL=$((TOTAL + 8))
done

for city in "${CITIES_P3[@]}"; do
  if [ $TOTAL -ge $TARGET ]; then break; fi
  echo ""
  echo "=========================================="
  echo "  Scraping $city (P3, limit 5)"
  echo "=========================================="
  npx tsx scripts/scrape.ts --city "$city" --source yelp --limit 5
  TOTAL=$((TOTAL + 5))
done

echo ""
echo "=========================================="
echo "  Done! Attempted ~$TOTAL imports"
echo "=========================================="
