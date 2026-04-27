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
} from "@chakra-ui/react";
import { SearchIcon, ArrowUpIcon, ArrowDownIcon, DownloadIcon } from "@chakra-ui/icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GroupLeaderView = () => {
  const [leaders, setLeaders] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [workers, setWorkers] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para filtro y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nombre"); // "rut" o "nombre"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"

  // Cargar líderes habilitados
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

  // Cargar trabajadores al seleccionar un líder
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!selectedLeader) {
        setWorkers([]);
        return;
      }
      try {
        setLoadingWorkers(true);
        const q = query(
          collection(db, "worker"),
          where("groupLeader", "array-contains", selectedLeader)
        );
        const snapshot = await getDocs(q);
        const workersList = snapshot.docs.map((doc) => ({
          rut: doc.id,
          name: doc.data().name || "Sin nombre",
        }));
        setWorkers(workersList);
        // Resetear filtros al cambiar de líder
        setSearchTerm("");
        setSortBy("nombre");
        setSortOrder("asc");
      } catch (err) {
        console.error("Error al cargar trabajadores:", err);
        setError("Error al cargar los trabajadores de este líder.");
      } finally {
        setLoadingWorkers(false);
      }
    };
    fetchWorkers();
  }, [selectedLeader]);

  // Filtrar trabajadores
  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workers;
    const term = searchTerm.toLowerCase();
    return workers.filter(
      (w) =>
        w.rut.toLowerCase().includes(term) ||
        w.name.toLowerCase().includes(term)
    );
  }, [workers, searchTerm]);

  // Ordenar trabajadores
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

  // Exportar a PDF
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
    
    const tableColumn = ["RUT", "Nombre"];
    const tableRows = sortedWorkers.map((w) => [w.rut, w.name]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "striped",
      headStyles: { fillColor: [47, 133, 90] }, // verde
      margin: { left: 14, right: 14 },
    });
    
    doc.save(`trabajadores_${selectedLeader}.pdf`);
  };

  const handleLeaderChange = (e) => {
    setSelectedLeader(e.target.value);
  };

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
            </HStack>
          </Flex>

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
              {searchTerm ? "No hay trabajadores que coincidan con el filtro." : "No hay trabajadores asignados a este líder."}
            </Alert>
          ) : (
            <>
              <Text fontSize="sm" color="gray.600">
                Mostrando {sortedWorkers.length} trabajador(es)
              </Text>
              <Table variant="simple" size="sm">
                <Thead bg="green.100">
                  <Tr>
                    <Th cursor="pointer" onClick={() => handleSort("rut")}>
                      RUT {sortBy === "rut" && (sortOrder === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSort("nombre")}>
                      Nombre {sortBy === "nombre" && (sortOrder === "asc" ? "↑" : "↓")}
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedWorkers.map((worker) => (
                    <Tr key={worker.rut}>
                      <Td>{worker.rut}</Td>
                      <Td>{worker.name}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default GroupLeaderView;