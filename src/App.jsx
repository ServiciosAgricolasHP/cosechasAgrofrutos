import { useState } from "react"
import { getWorkerWeights } from "./services/getWorkerWeights"

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
  VStack
} from "@chakra-ui/react"

import { motion } from "framer-motion"

const MotionBox = motion.create(Box)

function App() {

  const [rut, setRut] = useState("")
  const [data, setData] = useState(null)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [openDay, setOpenDay] = useState(null)

  async function buscar() {

    if (!rut) return

    const result = await getWorkerWeights(rut)

    setData(result)

    if (result?.firstDate) setStartDate(result.firstDate)
    if (result?.lastDate) setEndDate(result.lastDate)

  }

  /*
  Filtrado por rango de fechas
  */

  let filteredDays = data?.days || []

  if (startDate) {
    filteredDays = filteredDays.filter(d => d.date >= startDate)
  }

  if (endDate) {
    filteredDays = filteredDays.filter(d => d.date <= endDate)
  }

  return (

    <Container maxW="900px" py="10">

      <VStack spacing="8" align="stretch">

        <Heading textAlign="center" color="blue.700">
          Cosecha Agrofrutos
        </Heading>

        <Stack direction={{ base: "column", md: "row" }} spacing="3">

          <Input
            placeholder="Ingrese RUT"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
          />

          <Button
            colorScheme="blue"
            onClick={buscar}
          >
            Buscar
          </Button>

        </Stack>

        {
          data?.worker && (

            <Box
              p="4"
              borderRadius="lg"
              bg="blue.50"
            >

              <Text fontWeight="bold">
                {data.worker.name}
              </Text>

              <Text fontSize="sm">
                RUT: {rut}
              </Text>

              <HStack mt="2" wrap="wrap">

                {data.worker.idQr?.map(code => (

                  <Badge
                    key={code}
                    colorScheme="blue"
                  >
                    {code}
                  </Badge>

                ))}

              </HStack>

              <Text mt="2" fontWeight="bold">
                Total cosechado: {data.total} kg
              </Text>

            </Box>

          )
        }

        {
          data && (

            <Stack
              direction={{ base: "column", md: "row" }}
              spacing="3"
            >

              <Input
                type="date"
                value={startDate}
                min={data.firstDate}
                max={data.lastDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                type="date"
                value={endDate}
                min={data.firstDate}
                max={data.lastDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

            </Stack>

          )
        }

        {
          filteredDays.length > 0 && (

            <Table variant="simple" size="sm">

              <Thead bg="blue.100">

                <Tr>
                  <Th>Fecha</Th>
                  <Th isNumeric>Kilos</Th>
                  <Th isNumeric>Pesajes</Th>
                  <Th></Th>
                </Tr>

              </Thead>

              <Tbody>

                {filteredDays.map((day) => (

                  <>
                  
                  <Tr key={day.date}>

                    <Td>{day.date}</Td>

                    <Td isNumeric>
                      {day.total} kg
                    </Td>

                    <Td isNumeric>
                      {day.count}
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

                    <Td colSpan="4" p="0">

                      <Collapse in={openDay === day.date} animateOpacity>

                        <MotionBox
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          p="4"
                          bg="gray.50"
                        >

                          <HStack wrap="wrap">

                            {day.entries.map((entry, i) => (

                              <Badge
                                key={day.date + "-" + i}
                                colorScheme="blue"
                                fontSize="sm"
                                p="2"
                                borderRadius="md"
                              >
                                {entry.amount} kg
                              </Badge>

                            ))}

                          </HStack>

                        </MotionBox>

                      </Collapse>

                    </Td>

                  </Tr>

                  </>

                ))}

              </Tbody>

            </Table>

          )
        }

      </VStack>

    </Container>

  )

}

export default App