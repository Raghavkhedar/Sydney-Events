import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [city, setCity] = useState("Sydney");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (city) params.append("city", city);
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `https://sydney-events-backendd.onrender.com/api/dashboard/events?${params.toString()}`;

      const res = await axios.get(url, {
        withCredentials: true,
      });

      setEvents(res.data);
      // Maintain selected event if it still exists
      if (selectedEvent) {
        const updated = res.data.find((e) => e._id === selectedEvent._id);
        setSelectedEvent(updated || null);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      if (err.code === "ECONNREFUSED" || err.message.includes("Network Error")) {
        setError("Connection refused. Please make sure the backend server is running.");
      } else if (err.response?.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else {
        setError(err.response?.data?.message || err.message || "Failed to load events");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importEvent = async (id) => {
    try {
      await axios.patch(
        `https://sydney-events-backendd.onrender.com/api/dashboard/events/${id}/import`,
        {},
        { withCredentials: true }
      );

      setEvents((prev) =>
        prev.map((e) =>
          e._id === id ? { ...e, status: "imported" } : e
        )
      );

      if (selectedEvent && selectedEvent._id === id) {
        setSelectedEvent((prev) => (prev ? { ...prev, status: "imported" } : prev));
      }
    } catch (err) {
      console.error("Error importing event:", err);
      alert(err.response?.data?.message || "Failed to import event");
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (status) {
      case "new":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            New
          </span>
        );
      case "updated":
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Updated
          </span>
        );
      case "inactive":
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-500`}>
            Inactive
          </span>
        );
      case "imported":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Imported
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Events
            </Link>
            <a
              href="https://sydney-events-frontend.onrender.com/"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Imported</p>
              <p className="text-2xl font-bold text-green-600">
                {events.filter((e) => e.status === "imported").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Updated</p>
              <p className="text-2xl font-bold text-yellow-600">
                {events.filter((e) => e.status === "updated").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-500">
                {events.filter((e) => e.status === "inactive").length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Title, venue or description"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="updated">Updated</option>
                <option value="imported">Imported</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => {
                setCity("Sydney");
                setSearch("");
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
                fetchEvents();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-600">No events found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Table */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Venue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {events.map((e) => (
                          <tr
                            key={e._id}
                            className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedEvent && selectedEvent._id === e._id
                                ? "bg-indigo-50"
                                : ""
                            }`}
                            onClick={() => setSelectedEvent(e)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                                {e.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {e.venueName || "TBA"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(e.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {e.status !== "imported" ? (
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    importEvent(e._id);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 font-medium"
                                >
                                  Import
                                </button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview panel */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  {selectedEvent ? (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 pr-4">
                          {selectedEvent.title}
                        </h2>
                        {getStatusBadge(selectedEvent.status)}
                      </div>

                      <p className="text-xs uppercase text-gray-500 mb-1">
                        Venue
                      </p>
                      <p className="text-sm text-gray-800 mb-3">
                        {selectedEvent.venueName || "TBA"}
                      </p>

                      {selectedEvent.dateTime && (
                        <div className="mb-3">
                          <p className="text-xs uppercase text-gray-500 mb-1">
                            Date &amp; Time
                          </p>
                          <p className="text-sm text-gray-800">
                            {new Date(selectedEvent.dateTime).toLocaleString(
                              "en-AU",
                              { dateStyle: "medium", timeStyle: "short" }
                            )}
                          </p>
                        </div>
                      )}

                      {selectedEvent.description && (
                        <div className="mb-3">
                          <p className="text-xs uppercase text-gray-500 mb-1">
                            Description
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {selectedEvent.description}
                          </p>
                        </div>
                      )}

                      {selectedEvent.sourceUrl && (
                        <div className="mb-3">
                          <p className="text-xs uppercase text-gray-500 mb-1">
                            Source
                          </p>
                          <a
                            href={selectedEvent.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-800 underline break-all"
                          >
                            {selectedEvent.sourceUrl}
                          </a>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                        {selectedEvent.city && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full">
                            City: {selectedEvent.city}
                          </span>
                        )}
                        {selectedEvent.importedBy && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full">
                            Imported by: {selectedEvent.importedBy}
                          </span>
                        )}
                        {selectedEvent.importedAt && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full">
                            Imported at:{" "}
                            {new Date(selectedEvent.importedAt).toLocaleString(
                              "en-AU",
                              { dateStyle: "short", timeStyle: "short" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      Select an event from the table to see details here.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
