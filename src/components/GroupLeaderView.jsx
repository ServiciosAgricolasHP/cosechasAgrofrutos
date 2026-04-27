import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Heading,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  VStack,
  Input,
  Button,
  HStack,
  IconButton,
  Tooltip,
  InputGroup,
  InputLeftElement,
  Flex,
  Badge,
  RadioGroup,
  Radio,
  Stack,
} from "@chakra-ui/react";
import { SearchIcon, ArrowUpIcon, ArrowDownIcon, DownloadIcon } from "@chakra-ui/icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const GroupLeaderView = () => {
  const [leaders, setLeaders] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [workersRaw, setWorkersRaw] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nombre");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        setLoadingLeaders(true);
        const q = query(
          collection(db, "groupLeader"),
          where("habilitado", "==", true)
        );
        const snapshot = await getDocs(q);
        const leadersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLeaders(leadersList);
      } catch (err) {
        console.error("Error al cargar líderes:", err);
        setError("No se pudieron cargar los líderes de grupo.");
      } finally {
        setLoadingLeaders(false);
      }
    };
    fetchLeaders();
  }, []);

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!selectedLeader) {
        setWorkersRaw([]);
        return;
      }
      try {
        setLoadingWorkers(true);
        const q = query(
          collection(db, "worker"),
          where("groupLeader", "array-contains", selectedLeader)
        );
        const snapshot = await getDocs(q);
        const workersList = snapshot.docs.map((doc) => {
          const data = doc.data();
          const groupLeaderArray = data.groupLeader || [];
          let status = "none";
          if (groupLeaderArray[0] === selectedLeader) {
            status = "active";
          } else if (groupLeaderArray.includes(selectedLeader)) {
            status = "past";
          }
          return {
            rut: doc.id,
            name: data.name || "Sin nombre",
            groupLeader: groupLeaderArray,
            status,
          };
        });
        setWorkersRaw(workersList);
        setSearchTerm("");
        setSortBy("nombre");
        setSortOrder("asc");
        setStatusFilter("all");
      } catch (err) {
        console.error("Error al cargar trabajadores:", err);
        setError("Error al cargar los trabajadores de este líder.");
      } finally {
        setLoadingWorkers(false);
      }
    };
    fetchWorkers();
  }, [selectedLeader]);

  const filteredWorkers = useMemo(() => {
    let result = workersRaw;
    if (statusFilter === "active") {
      result = result.filter(w => w.status === "active");
    } else if (statusFilter === "past") {
      result = result.filter(w => w.status === "past");
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        w => w.rut.toLowerCase().includes(term) || w.name.toLowerCase().includes(term)
      );
    }
    return result;
  }, [workersRaw, searchTerm, statusFilter]);

  const sortedWorkers = useMemo(() => {
    const sorted = [...filteredWorkers];
    sorted.sort((a, b) => {
      let valA = sortBy === "rut" ? a.rut : a.name;
      let valB = sortBy === "rut" ? b.rut : b.name;
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredWorkers, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const exportToPDF = () => {
    if (!selectedLeader || sortedWorkers.length === 0) return;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    doc.setFontSize(16);
    doc.text(`Trabajadores del líder: ${selectedLeader}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Exportado: ${date} ${time}`, 14, 22);
    doc.text(`Total de trabajadores: ${sortedWorkers.length}`, 14, 29);
    doc.text(`Filtro de estado: ${statusFilter === "all" ? "Todos" : statusFilter === "active" ? "Activos" : "Anteriores"}`, 14, 36);
    const tableColumn = ["RUT", "Nombre", "Estado"];
    const tableRows = sortedWorkers.map(w => [
      w.rut,
      w.name,
      w.status === "active" ? "Activo" : "Anterior",
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 43,
      theme: "striped",
      headStyles: { fillColor: [47, 133, 90] },
      margin: { left: 14, right: 14 },
    });
    doc.save(`trabajadores_${selectedLeader}.pdf`);
  };

  const exportToExcel = () => {
    if (!selectedLeader || sortedWorkers.length === 0) return;
    let sheetName = `Trabajadores_${selectedLeader}`;
    sheetName = sheetName.replace(/[\\/*?:[\]]/g, "");
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);
    }
    if (sheetName.length === 0) {
      sheetName = "Trabajadores";
    }
    const worksheetData = [
      ["RUT", "Nombre", "Estado"],
      ...sortedWorkers.map(w => [
        w.rut,
        w.name,
        w.status === "active" ? "Activo" : "Anterior"
      ])
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `trabajadores_${selectedLeader}.xlsx`);
  };

  const handleLeaderChange = (e) => {
    setSelectedLeader(e.target.value);
  };

  const activeCount = workersRaw.filter(w => w.status === "active").length;
  const pastCount = workersRaw.filter(w => w.status === "past").length;

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
      <Heading size="md" mb={4} color="green.700">
        👥 Trabajadores por Líder de Grupo
      </Heading>

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Select
        placeholder="Seleccione un líder de grupo"
        value={selectedLeader}
        onChange={handleLeaderChange}
        mb={6}
        isDisabled={loadingLeaders}
      >
        {leaders.map((leader) => (
          <option key={leader.id} value={leader.id}>
            {leader.id} ✅
          </option>
        ))}
      </Select>

      {loadingLeaders && (
        <Box textAlign="center" py={4}>
          <Spinner />
          <Text mt={2}>Cargando líderes...</Text>
        </Box>
      )}

      {selectedLeader && !loadingLeaders && (
        <VStack align="stretch" spacing={4}>
          {!loadingWorkers && workersRaw.length > 0 && (
            <Flex gap={4} wrap="wrap">
              <Badge colorScheme="green" p={2} borderRadius="md">
                Activos: {activeCount}
              </Badge>
              <Badge colorScheme="gray" p={2} borderRadius="md">
                Anteriores: {pastCount}
              </Badge>
            </Flex>
          )}

          <Flex justify="space-between" wrap="wrap" gap={3}>
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Filtrar por RUT o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <HStack>
              <Button size="sm" variant="outline" onClick={clearSearch}>
                Limpiar filtro
              </Button>
              <Tooltip label="Exportar a PDF">
                <IconButton
                  icon={<DownloadIcon />}
                  colorScheme="red"
                  variant="outline"
                  onClick={exportToPDF}
                  aria-label="Exportar a PDF"
                  isDisabled={sortedWorkers.length === 0}
                />
              </Tooltip>
              <Tooltip label="Exportar a Excel">
                <IconButton
                  icon={<DownloadIcon />}
                  colorScheme="green"
                  variant="outline"
                  onClick={exportToExcel}
                  aria-label="Exportar a Excel"
                  isDisabled={sortedWorkers.length === 0}
                />
              </Tooltip>
            </HStack>
          </Flex>

          <RadioGroup onChange={setStatusFilter} value={statusFilter}>
            <Stack direction="row" spacing={4}>
              <Radio value="all">Todos</Radio>
              <Radio value="active">Solo activos</Radio>
              <Radio value="past">Solo anteriores</Radio>
            </Stack>
          </RadioGroup>

          <HStack spacing={4} borderBottom="1px solid" borderColor="gray.200" pb={2}>
            <Text fontWeight="bold">Ordenar por:</Text>
            <Button
              size="xs"
              variant="ghost"
              rightIcon={sortBy === "rut" && (sortOrder === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />)}
              onClick={() => handleSort("rut")}
              colorScheme={sortBy === "rut" ? "blue" : "gray"}
            >
              RUT
            </Button>
            <Button
              size="xs"
              variant="ghost"
              rightIcon={sortBy === "nombre" && (sortOrder === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />)}
              onClick={() => handleSort("nombre")}
              colorScheme={sortBy === "nombre" ? "blue" : "gray"}
            >
              Nombre
            </Button>
          </HStack>

          {loadingWorkers ? (
            <Box textAlign="center" py={4}>
              <Spinner />
              <Text mt={2}>Cargando trabajadores...</Text>
            </Box>
          ) : sortedWorkers.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              {searchTerm || statusFilter !== "all"
                ? "No hay trabajadores que coincidan con los filtros actuales."
                : "No hay trabajadores asignados a este líder (ni activos ni anteriores)."}
            </Alert>
          ) : (
            <>
              <Text fontSize="sm" color="gray.600">
                Mostrando {sortedWorkers.length} trabajador(es)
              </Text>
              {/* Contenedor con overflow horizontal para móviles */}
              <Box overflowX="auto">
                <Table variant="simple" size="sm" minWidth="500px">
                  <Thead bg="green.100">
                    <Tr>
                      <Th minW="150px" cursor="pointer" onClick={() => handleSort("rut")}>
                        RUT {sortBy === "rut" && (sortOrder === "asc" ? "↑" : "↓")}
                      </Th>
                      <Th minW="200px" cursor="pointer" onClick={() => handleSort("nombre")}>
                        Nombre {sortBy === "nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                      </Th>
                      <Th minW="100px">Estado</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedWorkers.map((worker) => (
                      <Tr key={worker.rut}>
                        <Td>{worker.rut}</Td>
                        <Td>{worker.name}</Td>
                        <Td>
                          {worker.status === "active" ? (
                            <Badge colorScheme="green">Activo</Badge>
                          ) : (
                            <Badge colorScheme="gray">Anterior</Badge>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default GroupLeaderView;