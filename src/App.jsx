import React, { useState, Fragment, useRef } from "react";
import { getWorkerWeightsOptimized } from "./services/getWorkerWeightsOptimized";
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Collapse,
  HStack,
  VStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Wrap,
  WrapItem,
  Select,
  useMediaQuery,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { ViewIcon, CalendarIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import StatsCards from "./components/StatsCards";
import MobileDayCards from "./components/MobileDayCards";
import CalendarView from "./components/CalendarView";
import CopyTableButton from "./components/CopyTableButton";
import GroupLeaderView from "./components/GroupLeaderView"; // 👈 nueva importación

const MotionBox = motion.create(Box);

const getProductColor = (productType) => {
  const colors = { export: "green", iqf: "orange" };
  return colors[productType] || "blue";
};

const getUnitColor = (unitType) => {
  const colors = { kg: "teal", bandejas: "cyan", capacho: "yellow" };
  return colors[unitType] || "gray";
};

function App() {
  const [rut, setRut] = useState("");
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openDay, setOpenDay] = useState(null);
  const [minAvailableDate, setMinAvailableDate] = useState(null);
  const [maxAvailableDate, setMaxAvailableDate] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("todos");
  const [viewMode, setViewMode] = useState("table");
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const tableRef = useRef(null);

  // 👇 nuevo estado para cambiar entre vistas
  const [activeTab, setActiveTab] = useState("weights"); // "weights" o "groupLeaders"

  async function buscar() {
    if (!rut) return;
    try {
      const result = await getWorkerWeightsOptimized(rut, { startDate, endDate });
      if (result.error) {
        setData(null);
        setMinAvailableDate(null);
        setMaxAvailableDate(null);
        setStartDate("");
        setEndDate("");
        alert(result.message);
        return;
      }
      setData(result);
      if (result?.firstDate) {
        setMinAvailableDate(result.firstDate);
        setStartDate(result.firstDate);
      } else {
        setMinAvailableDate(null);
        setStartDate("");
      }
      if (result?.lastDate) {
        setMaxAvailableDate(result.lastDate);
        setEndDate(result.lastDate);
      } else {
        setMaxAvailableDate(null);
        setEndDate("");
      }
      setSelectedLocation("todos");
    } catch (error) {
      console.error(error);
      setData(null);
      setMinAvailableDate(null);
      setMaxAvailableDate(null);
      setStartDate("");
      setEndDate("");
      alert("Error al buscar: " + error.message);
    }
  }

  const clearFilters = () => {
    if (minAvailableDate) setStartDate(minAvailableDate);
    if (maxAvailableDate) setEndDate(maxAvailableDate);
  };

  let filteredDays = data?.days || [];
  if (selectedLocation !== "todos") {
    filteredDays = filteredDays.filter((day) => day.locations.includes(selectedLocation));
  }
  if (startDate) filteredDays = filteredDays.filter((d) => d.date >= startDate);
  if (endDate) filteredDays = filteredDays.filter((d) => d.date <= endDate);

  const computeFilteredTotals = () => {
    const totalsMap = new Map();
    filteredDays.forEach((day) => {
      day.totals.forEach((total) => {
        const key = total.key;
        if (!totalsMap.has(key)) {
          totalsMap.set(key, { ...total, amount: 0, count: 0 });
        }
        const existing = totalsMap.get(key);
        existing.amount += total.amount;
        existing.count += total.count;
      });
    });
    return Array.from(totalsMap.values()).map(t => ({
      ...t,
      amount: Number(t.amount.toFixed(2))
    })).sort((a, b) => {
      if (a.productType !== b.productType) return a.productType.localeCompare(b.productType);
      return a.unitType.localeCompare(b.unitType);
    });
  };

  const filteredTotals = computeFilteredTotals();

  const totalEntriesFiltered = filteredDays.reduce((sum, d) => sum + d.entries.length, 0);
  const daysCountFiltered = filteredDays.length;
  const locationsCountFiltered = new Set(filteredDays.flatMap(d => d.locations)).size;
  const totalWeightFiltered = filteredTotals.reduce((sum, t) => sum + t.amount, 0);
  const avgDailyFiltered = daysCountFiltered > 0 ? (totalWeightFiltered / daysCountFiltered).toFixed(1) : 0;

  return (
    <Container maxW="1200px" py="10">
      <VStack spacing="8" align="stretch">
        <Heading textAlign="center" color="green.700">
          Cosecha Agrofrutos - Visor de Pesajes
        </Heading>

        {/* 👇 Pestañas para cambiar entre vistas */}
        <HStack justify="center" spacing={4}>
          <Button
            colorScheme={activeTab === "weights" ? "green" : "gray"}
            variant={activeTab === "weights" ? "solid" : "outline"}
            onClick={() => setActiveTab("weights")}
          >
            📦 Pesajes
          </Button>
          <Button
            colorScheme={activeTab === "groupLeaders" ? "green" : "gray"}
            variant={activeTab === "groupLeaders" ? "solid" : "outline"}
            onClick={() => setActiveTab("groupLeaders")}
          >
            👥 Líderes de Grupo
          </Button>
        </HStack>

        {activeTab === "weights" ? (
          // -------------------- VISTA DE PESAJES (original) --------------------
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing="3">
              <Input
                placeholder="Ingrese RUT o código QR (ej: SF-200, 12345678-K)"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && buscar()}
              />
              <Button colorScheme="green" onClick={buscar}>
                Buscar
              </Button>
            </Stack>

            {data?.worker && (
              <Box p="4" borderRadius="lg" bg="green.50">
                <Flex justify="space-between" align="start" wrap="wrap">
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">
                      {data.worker.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      RUT: {data.worker.rut}
                    </Text>
                  </Box>
                  <Badge colorScheme={data.searchType === "qr" ? "purple" : "blue"}>
                    Buscado por: {data.searchType === "qr" ? "Código QR" : "RUT"}
                  </Badge>
                </Flex>
                <HStack mt="2" wrap="wrap">
                  {data.worker.idQr?.map((code) => (
                    <Badge key={code} colorScheme="green">
                      {code}
                    </Badge>
                  ))}
                </HStack>
                {data.locations && data.locations.length > 0 && (
                  <HStack mt="2">
                    <Text fontSize="sm" fontWeight="semibold">
                      Lugares:
                    </Text>
                    {data.locations.map((loc) => (
                      <Badge key={loc} colorScheme="blue" variant="outline">
                        {loc}
                      </Badge>
                    ))}
                  </HStack>
                )}
                {minAvailableDate && maxAvailableDate && (
                  <Text fontSize="xs" color="gray.500" mt="2">
                    📅 Rango disponible: {minAvailableDate} al {maxAvailableDate}
                  </Text>
                )}
              </Box>
            )}

            {data && (
              <StatsCards
                daysCount={daysCountFiltered}
                totalEntries={totalEntriesFiltered}
                locationsCount={locationsCountFiltered}
                avgDaily={avgDailyFiltered}
              />
            )}

            {filteredTotals.length > 0 && (
              <Wrap spacing="4" justify="center">
                {filteredTotals.map((total) => (
                  <WrapItem key={total.key}>
                    <Box
                      p="4"
                      borderRadius="lg"
                      bg={`${getProductColor(total.productType)}.50`}
                      minW="150px"
                    >
                      <Stat>
                        <StatLabel color={`${getProductColor(total.productType)}.700`}>
                          {total.productName} - {total.unitName}
                        </StatLabel>
                        <StatNumber fontSize="xl">
                          {total.amount} {total.unitType === "kg" ? "kg" : ""}
                        </StatNumber>
                        <StatHelpText>{total.count} pesajes</StatHelpText>
                      </Stat>
                    </Box>
                  </WrapItem>
                ))}
              </Wrap>
            )}

            {data && minAvailableDate && maxAvailableDate && (
              <Stack direction={{ base: "column", md: "row" }} spacing="3" align="center">
                <Input
                  type="date"
                  value={startDate}
                  min={minAvailableDate}
                  max={maxAvailableDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  value={endDate}
                  min={minAvailableDate}
                  max={maxAvailableDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  size="sm"
                  width="200px"
                >
                  <option value="todos">Todos los lugares</option>
                  {data.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Restablecer rango
                </Button>
              </Stack>
            )}

            {data && (
              <HStack justify="flex-end" spacing={2}>
                <Tooltip label="Vista tabla">
                  <IconButton
                    icon={<ViewIcon />}
                    variant={viewMode === "table" ? "solid" : "outline"}
                    colorScheme="blue"
                    onClick={() => setViewMode("table")}
                    aria-label="Vista tabla"
                  />
                </Tooltip>
                <Tooltip label="Vista calendario">
                  <IconButton
                    icon={<CalendarIcon />}
                    variant={viewMode === "calendar" ? "solid" : "outline"}
                    colorScheme="blue"
                    onClick={() => setViewMode("calendar")}
                    aria-label="Vista calendario"
                  />
                </Tooltip>
                {viewMode === "table" && filteredDays.length > 0 && !isMobile && (
                  <CopyTableButton targetRef={tableRef} />
                )}
              </HStack>
            )}

            {data && (
              <>
                {viewMode === "calendar" ? (
                  <CalendarView days={filteredDays} />
                ) : (
                  <>
                    {isMobile ? (
                      <MobileDayCards days={filteredDays} totals={filteredTotals} />
                    ) : (
                      <Box ref={tableRef}>
                        <Table variant="simple" size="sm">
                          <Thead bg="green.100">
                            <Tr>
                              <Th>Fecha</Th>
                              {filteredTotals.map((total) => (
                                <Th key={total.key} isNumeric>
                                  {total.productName}
                                  <br />
                                  <Text fontSize="xs" fontWeight="normal">
                                    {total.unitName}
                                  </Text>
                                </Th>
                              ))}
                              <Th isNumeric>Total Pesajes</Th>
                              <Th>Lugares</Th>
                              <Th></Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredDays.map((day) => (
                              <Fragment key={day.date}>
                                <Tr>
                                  <Td fontWeight="medium">{day.date}</Td>
                                  {filteredTotals.map((total) => {
                                    const dayTotal = day.totals.find(
                                      (t) => t.key === total.key
                                    );
                                    const amount = dayTotal?.amount || 0;
                                    return (
                                      <Td key={total.key} isNumeric>
                                        {amount > 0 ? (
                                          <Badge
                                            colorScheme={getProductColor(
                                              total.productType
                                            )}
                                            fontSize="sm"
                                            p="1"
                                          >
                                            {amount}{" "}
                                            {amount > 0 && total.unitType !== "kg"
                                              ? total.unitName
                                              : ""}
                                          </Badge>
                                        ) : (
                                          "-"
                                        )}
                                      </Td>
                                    );
                                  })}
                                  <Td isNumeric>{day.entries.length}</Td>
                                  <Td>
                                    <HStack spacing={1}>
                                      {day.locations.map((loc) => (
                                        <Badge key={loc} size="sm" variant="outline">
                                          {loc}
                                        </Badge>
                                      ))}
                                    </HStack>
                                  </Td>
                                  <Td>
                                    <Button
                                      size="xs"
                                      onClick={() =>
                                        setOpenDay(
                                          openDay === day.date ? null : day.date
                                        )
                                      }
                                    >
                                      Ver detalle
                                    </Button>
                                  </Td>
                                </Tr>
                                <Tr key={day.date + "-details"}>
                                  <Td colSpan={filteredTotals.length + 4} p="0">
                                    <Collapse in={openDay === day.date} animateOpacity>
                                      <MotionBox
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        p="4"
                                        bg="gray.50"
                                      >
                                        <SimpleGrid
                                          columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
                                          spacing="3"
                                        >
                                          {day.entries.map((entry, i) => (
                                            <Box
                                              key={i}
                                              p="3"
                                              borderWidth="1px"
                                              borderRadius="md"
                                              bg="white"
                                              shadow="sm"
                                            >
                                              <Flex
                                                justify="space-between"
                                                align="center"
                                                mb="2"
                                              >
                                                <Badge
                                                  colorScheme={getProductColor(
                                                    entry.quality.product.toLowerCase()
                                                  )}
                                                >
                                                  {entry.quality.product}
                                                </Badge>
                                                <Badge
                                                  colorScheme={getUnitColor(
                                                    entry.quality.unit.toLowerCase()
                                                  )}
                                                >
                                                  {entry.quality.unit}
                                                </Badge>
                                                <Badge variant="outline">
                                                  {entry.locationCode}
                                                </Badge>
                                              </Flex>
                                              <Text
                                                fontSize="2xl"
                                                fontWeight="bold"
                                                textAlign="center"
                                                my="2"
                                              >
                                                {entry.amount}
                                                <Text
                                                  as="span"
                                                  fontSize="sm"
                                                  fontWeight="normal"
                                                >
                                                  {" "}
                                                  {entry.quality.unit === "Kilos"
                                                    ? "kg"
                                                    : ""}
                                                </Text>
                                              </Text>
                                              <Text
                                                fontSize="xs"
                                                color="gray.500"
                                                textAlign="center"
                                              >
                                                Supervisor: {entry.supervisor}
                                              </Text>
                                              {entry.paid && (
                                                <Badge
                                                  colorScheme="purple"
                                                  size="sm"
                                                  mt="2"
                                                  width="full"
                                                  textAlign="center"
                                                >
                                                  Pagado
                                                </Badge>
                                              )}
                                            </Box>
                                          ))}
                                        </SimpleGrid>
                                      </MotionBox>
                                    </Collapse>
                                  </Td>
                                </Tr>
                              </Fragment>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </>
                )}
              </>
            )}

            {filteredDays.length === 0 && data && (
              <Box textAlign="center" py="10">
                <Text color="gray.500">
                  No hay registros en el rango de fechas seleccionado
                </Text>
                {minAvailableDate && maxAvailableDate && (
                  <Button size="sm" mt="2" onClick={clearFilters}>
                    Ver todo el rango ({minAvailableDate} - {maxAvailableDate})
                  </Button>
                )}
              </Box>
            )}
          </>
        ) : (
          // -------------------- VISTA DE LÍDERES DE GRUPO (nueva) --------------------
          <GroupLeaderView />
        )}
      </VStack>
    </Container>
  );
}

export default App;