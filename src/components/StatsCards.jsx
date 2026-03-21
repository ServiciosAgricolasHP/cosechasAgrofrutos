import React from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';

const StatsCards = ({ daysCount, totalEntries, locationsCount, avgDaily }) => {
  return (
    <Box>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing="4" mb="4">
        <Box p="4" borderRadius="lg" bg="blue.50">
          <Stat>
            <StatLabel>Total Pesajes</StatLabel>
            <StatNumber>{totalEntries}</StatNumber>
            <StatHelpText>registros</StatHelpText>
          </Stat>
        </Box>
        <Box p="4" borderRadius="lg" bg="green.50">
          <Stat>
            <StatLabel>Días Trabajados</StatLabel>
            <StatNumber>{daysCount}</StatNumber>
            <StatHelpText>días</StatHelpText>
          </Stat>
        </Box>
        <Box p="4" borderRadius="lg" bg="purple.50">
          <Stat>
            <StatLabel>Lugares Diferentes</StatLabel>
            <StatNumber>{locationsCount}</StatNumber>
            <StatHelpText>ubicaciones</StatHelpText>
          </Stat>
        </Box>
        <Box p="4" borderRadius="lg" bg="orange.50">
          <Stat>
            <StatLabel>Promedio Diario</StatLabel>
            <StatNumber>{avgDaily}</StatNumber>
            <StatHelpText>kg/día</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default StatsCards;