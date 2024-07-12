"use client";
import { useEffect, useState } from "react";

// Function to fetch and parse CSV data
async function fetchCSVData(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const text = await res.text();
  const cleanText = text.replace(/\r/g, ""); // Remove all '\r' characters
  const rows = cleanText.split("\n").map((row) => row.split(","));

  const headers = rows[0]; // Assuming first row contains headers
  const data = rows.slice(1).map((row) => {
    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });
    return rowData;
  });

  return data;
}
function readCSVCache(id) {
  const text = localStorage.getItem(`nim-cache:${id}`);
  if (text == null)
    return null;
  const data = (() => { try { return JSON.parse(text); } catch (_) { return null; } })();
  if (data == null)
    return null;
  const age = Date.now() - data.lastFetched;
  if (isNaN(age) || age >= 7 * 24 * 60 * 60 * 1000)
    return null;
  return data.payload;
}
function putCSVCache(id, payload) {
  const data = {
    lastFetched: Date.now(),
    payload: payload
  };
  const text = JSON.stringify(data);
  localStorage.setItem(`nim-cache:${id}`, text);
}
function deleteAllCSVCache() {
  new Array(localStorage.length).fill(null).map((_, i) => localStorage.key(i))
    .filter(k => k.startsWith("nim-cache:")).forEach(k => localStorage.removeItem(k));
}
function seedrandom(seed) {
  // sfc32 with cyrb128 seeder
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < seed.length; i++) {
      k = seed.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4);
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  h1 = h1 >>> 0;
  h2 = h2 >>> 0;
  h3 = h3 >>> 0;
  h4 = h4 >>> 0;
  return () => {
    h1 |= 0; h2 |= 0; h3 |= 0; h4 |= 0;
    let t = (h1 + h2 | 0) + h4 | 0;
    h4 = h4 + 1 | 0;
    h1 = h2 ^ h2 >>> 9;
    h2 = h3 + (h3 << 3) | 0;
    h3 = (h3 << 21 | h3 >>> 11);
    h3 = h3 + t | 0;
    return (t >>> 0) / 4294967296;
  }
}
function forwardHash(string) {
	const random = seedrandom(string);
	random(); random(); random(); random(); random();
	return `${[...new Array(24)].map(() => Math.floor(random() * 16).toString(16)).join("")}`;
}

async function getData() {
  const cacheFirstThenFetch = async (url) => {
    const cacheId = forwardHash(url);
    const cached = readCSVCache(cacheId);
    if (cached != null)
      return cached;
    const fetched = await fetchCSVData(url);
    putCSVCache(cacheId, fetched);
    return fetched;
  }

  const urls = {
    angkatan20:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=0&single=true&output=csv",
    angkatan21:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=665736526&single=true&output=csv",
    angkatan22:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=1486137275&single=true&output=csv",
  };

  return Object.fromEntries(await Promise.all(Object.entries(urls)
    .map(async ([k, v]) => [k, await cacheFirstThenFetch(v)])));
}

export default function Home() {
  const [data, setData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term) {
      const results = [];
      Object.values(data).forEach((dataset) => {
        dataset.forEach((item) => {
          if (item.NIM && item.NIM.includes(term)) {
            results.push(item);
          }
        });
      });
      setFilteredData(results);
    } else {
      setFilteredData([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const newData = await getData();
      console.log(newData);
      setData(newData);
    };
    fetchData();
  }, []);

  return (
    <main className="flex h-screen flex-col items-center justify-center w-full py-8 bg-black text-white">
      <div className="relative w-full max-w-[604px] group">
        <div className="absolute -inset-0.5 rounded-lg w-full blur bg-gradient-to-tr from-purple-700 to-red-700 group-hover:blur-lg duration-150 ease-in" />
        <input
          type="text"
          placeholder="Search by NIM"
          value={searchTerm}
          onChange={handleSearch}
          className={`relative p-2 border-none rounded-lg w-full focus:outline-none max-w-[600px] mx-auto ${
            !data.angkatan20 ? "bg-gray-900" : "bg-black"
          }`}
          disabled={!data.angkatan20}
        />
      </div>

      <div className="h-0 grow px-4 py-8 w-full max-w-[700px]">
        {!data.angkatan20 && <p>Sedang mengambil data...</p>}
        {searchTerm && (
          <div className="w-full flex flex-col h-full overflow-y-auto gap-4 px-2">
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <div key={index} className="flex w-full rounded-lg px-2 py-4 bg-gradient-to-tr from-purple-700/30 to-red-600/30">
                  <div className="flex h-full items-center justify-center w-fit">
                    <p className="pr-2 font-bold">{item.NIM}</p>
                  </div>
                  <div className="pl-2 grow">
                    <p className="text-xs tracking-wide uppercase">
                      Jurusan: {item.Jurusan} - Kampus {item.Kampus || "ITB"}
                    </p>
                    <p className="text-xl">{item["Nama Lengkap"]}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No results found</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
