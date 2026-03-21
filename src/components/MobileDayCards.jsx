import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Badge,
  Flex,
  VStack,
  HStack,
} from '@chakra-ui/react';

const MobileDayCards = ({ days, totals }) => {
  return (
    <VStack spacing="4" align="stretch">
      {days.map((day) => (
        <Card key={day.date} variant="outline">
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <Heading size="sm">{day.date}</Heading>
              <Badge colorScheme="blue">{day.entries.length} pesajes</Badge>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            {totals.map((total) => {
              const dayTotal = day.totals.find((t) => t.key === total.key);
              const amount = dayTotal?.amount || 0;
              if (amount === 0) return null;
              return (
                <Flex key={total.key} justify="space-between" mb={2}>
                  <Text fontSize="sm">
                    {total.productName} ({total.unitName})
                  </Text>
                  <Text fontWeight="bold">
                    {amount} {total.unitType === 'kg' ? 'kg' : ''}
                  </Text>
                </Flex>
              );
            })}
            {day.locations.length > 0 && (
              <HStack mt={2} spacing={1} wrap="wrap">
                {day.locations.map((loc) => (
                  <Badge key={loc} variant="outline" size="sm">
                    {loc}
                  </Badge>
                ))}
              </HStack>
            )}
          </CardBody>
        </Card>
      ))}
    </VStack>
  );
};

export default MobileDayCards;