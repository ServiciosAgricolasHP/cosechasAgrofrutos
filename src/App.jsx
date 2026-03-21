// App.jsx - Versión corregida
import React, { useState, Fragment } from "react";
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
} from "@chakra-ui/react";

import { motion } from "framer-motion";

const MotionBox = motion.create(Box);

// Mapeo de colores por tipo de producto
const getProductColor = (productType) => {
  const colors = {
    export: "green",
    iqf: "orange",
  };
  return colors[productType] || "blue";
};

// Mapeo de colores por tipo de unidad
const getUnitColor = (unitType) => {
  const colors = {
    kg: "teal",
    bandejas: "cyan",
    capacho: "yellow",
  };
  return colors[unitType] || "gray";
};

function App() {
  const [rut, setRut] = useState("");
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openDay, setOpenDay] = useState(null);

  // Estado para los límites de fecha del trabajador actual
  const [minAvailableDate, setMinAvailableDate] = useState(null);
  const [maxAvailableDate, setMaxAvailableDate] = useState(null);

  // App.jsx - Agregar manejo de errores en la función buscar
  async function buscar() {
    if (!rut) return;

    try {
      const result = await getWorkerWeightsOptimized(rut, {
        startDate,
        endDate,
      });

      // Manejar error si no se encuentra el trabajador
      if (result.error) {
        setData(null);
        setMinAvailableDate(null);
        setMaxAvailableDate(null);
        setStartDate("");
        setEndDate("");
        alert(result.message); // Mostrar mensaje de error
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
    } catch (error) {
      console.error("Error al buscar:", error);
      setData(null);
      setMinAvailableDate(null);
      setMaxAvailableDate(null);
      setStartDate("");
      setEndDate("");
      alert("Error al buscar: " + error.message);
    }
  }

  // Función para limpiar filtros
  function clearFilters() {
    if (minAvailableDate) setStartDate(minAvailableDate);
    if (maxAvailableDate) setEndDate(maxAvailableDate);
  }

  let filteredDays = data?.days || [];
  if (startDate) filteredDays = filteredDays.filter((d) => d.date >= startDate);
  if (endDate) filteredDays = filteredDays.filter((d) => d.date <= endDate);

  return (
    <Container maxW="1200px" py="10">
      <VStack spacing="8" align="stretch">
        <Heading textAlign="center" color="green.700">
          Cosecha Agrofrutos - Visor de Pesajes
        </Heading>

        {/* Buscador */}
        <Stack direction={{ base: "column", md: "row" }} spacing="3">
          <Input
            placeholder="Ingrese RUT"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && buscar()}
          />
          <Button colorScheme="green" onClick={buscar}>
            Buscar
          </Button>
        </Stack>

        {/* Información del trabajador */}
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

            {/* Indicador de rango de fechas disponible */}
            {minAvailableDate && maxAvailableDate && (
              <Text fontSize="xs" color="gray.500" mt="2">
                📅 Rango disponible: {minAvailableDate} al {maxAvailableDate}
              </Text>
            )}
          </Box>
        )}

        {/* Estadísticas totales - Dinámico */}
        {data?.totals && data.totals.length > 0 && (
          <Wrap spacing="4" justify="center">
            {data.totals.map((total) => (
              <WrapItem key={total.key}>
                <Box
                  p="4"
                  borderRadius="lg"
                  bg={`${getProductColor(total.productType)}.50`}
                  minW="150px"
                >
                  <Stat>
                    <StatLabel
                      color={`${getProductColor(total.productType)}.700`}
                    >
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

        {/* Filtros de fecha - Actualizado con límites dinámicos */}
        {data && minAvailableDate && maxAvailableDate && (
          <Stack
            direction={{ base: "column", md: "row" }}
            spacing="3"
            align="center"
          >
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
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilters}
              isDisabled={
                startDate === minAvailableDate && endDate === maxAvailableDate
              }
            >
              Restablecer rango
            </Button>
          </Stack>
        )}

        {/* Tabla de días */}
        {filteredDays.length > 0 && (
          <Table variant="simple" size="sm">
            <Thead bg="green.100">
              <Tr>
                <Th>Fecha</Th>
                {data?.totals.map((total) => (
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
                    {data.totals.map((total) => {
                      const dayTotal = day.totals.find(
                        (t) => t.key === total.key,
                      );
                      const amount = dayTotal?.amount || 0;
                      return (
                        <Td key={total.key} isNumeric>
                          {amount > 0 ? (
                            <Badge
                              colorScheme={getProductColor(total.productType)}
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
                          setOpenDay(openDay === day.date ? null : day.date)
                        }
                      >
                        Ver detalle
                      </Button>
                    </Td>
                  </Tr>

                  <Tr key={day.date + "-details"}>
                    <Td colSpan={data.totals.length + 4} p="0">
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
                                      entry.quality.product.toLowerCase(),
                                    )}
                                  >
                                    {entry.quality.product}
                                  </Badge>
                                  <Badge
                                    colorScheme={getUnitColor(
                                      entry.quality.unit.toLowerCase(),
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
                                    {entry.quality.unit === "Kilos" ? "kg" : ""}
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
      </VStack>
    </Container>
  );
}

export default App;
