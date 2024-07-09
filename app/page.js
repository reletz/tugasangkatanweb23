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

async function getData() {
  const urls = {
    angkatan20:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=0&single=true&output=csv",
    angkatan21:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=665736526&single=true&output=csv",
    angkatan22:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=1486137275&single=true&output=csv",
  };

  const data = {};

  for (const [key, url] of Object.entries(urls)) {
    data[key] = await fetchCSVData(url);
  }

  return data;
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
