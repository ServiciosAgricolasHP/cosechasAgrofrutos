import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  SimpleGrid,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

const CalendarView = ({ days }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const daysArray = [];
    for (let i = startWeekday; i > 0; i--) {
      const prevDate = new Date(year, month, -i + 1);
      daysArray.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayData = days.find((d) => d.date === dateStr);
      const hasWork = !!dayData;
      const summary = hasWork
        ? `${dayData.entries.length} pesajes, ${dayData.locations.join(', ')}`
        : 'Sin actividad';
      daysArray.push({
        date: dateObj,
        isCurrentMonth: true,
        hasWork,
        summary,
      });
    }
    return daysArray;
  };

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate, days]);

  const goPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <IconButton
            icon={<ChevronLeftIcon />}
            onClick={goPrevMonth}
            size="sm"
            aria-label="Mes anterior"
          />
          <Text fontWeight="bold" fontSize="lg">
            {formatMonth(currentDate)}
          </Text>
          <IconButton
            icon={<ChevronRightIcon />}
            onClick={goNextMonth}
            size="sm"
            aria-label="Mes siguiente"
          />
        </HStack>
        <Button onClick={goToday} size="sm" variant="outline">
          Hoy
        </Button>
      </HStack>
      <SimpleGrid columns={7} spacing={1}>
        {weekDays.map((day) => (
          <Box key={day} textAlign="center" fontWeight="bold" fontSize="sm">
            {day}
          </Box>
        ))}
        {monthDays.map((dayObj, idx) => {
          const dateStr = dayObj.date.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          return (
            <Tooltip
              key={idx}
              label={`${dateStr}: ${dayObj.summary}`}
              placement="top"
              hasArrow
            >
              <Box
                textAlign="center"
                p={2}
                bg={dayObj.hasWork ? 'green.400' : dayObj.isCurrentMonth ? 'gray.100' : 'gray.50'}
                color={dayObj.hasWork ? 'white' : 'gray.700'}
                borderRadius="md"
                fontWeight={isToday ? 'bold' : 'normal'}
                border={isToday ? '2px solid blue' : 'none'}
                cursor="default"
              >
                {dayObj.date.getDate()}
              </Box>
            </Tooltip>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default CalendarView;