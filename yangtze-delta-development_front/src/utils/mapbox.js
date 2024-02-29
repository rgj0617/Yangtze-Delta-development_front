import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import MapboxLanguage from '@mapbox/mapbox-gl-language'
import CityData from '@/assets/json/standardCityBoundary.json'
import ranking from '@/assets/json/scoreDetail.json'

mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlbmdjaGFvODg2NiIsImEiOiJjbGhzcWowMHUwYTNyM2VwNXZhaXhjd3Q4In0.FEh2q7sEW88Z1B5GcK_TDg'; //去mapbox官⽹申请

const colorRanges = [
    {min: 0, max: 45, color: '#E31A1C'},
    {min: 45, max: 55, color: '#FEB24C'},
    {min: 55, max: 70, color: '#FFEDA0'},
    {min: 70, max: 100, color: '#90EE90'},
]
const colorRangesSingle = [
    {min: 0, max: 5, color: '#E31A1C'},
    {min: 5, max: 10, color: '#FEB24C'},
    {min: 10, max: 15, color: '#FFEDA0'},
    {min: 15, max: 20, color: '#90EE90'},
]
//test data
// const ranking2 = [
//   {cityName:"南京市" , score:"80"},
//   {cityName:"苏州市" , score:"60"},
//   {cityName:"安徽市" , score:"50"},
//   {cityName:"亳州市" , score:"8"}
// ]


export let map = null; // 导出 map 对象

export function loadMap(box) {
    map = new mapboxgl.Map({
        container: box,
        style: 'mapbox://styles/mapbox/streets-v11',
        preserveDrawingBuffer: true,
        center: [114, 30],
        zoom: 4
    });

    map.addControl(new MapboxLanguage({
        defaultLanguage: 'zh-Hans'
    }));
}

export function addGeoJson() {

    map.on('style.load', () => {
        // 加载 GeoJSON 数据源
        map.addSource('geojsonSource', {
            type: 'geojson',
            data: CityData // 替换为你的 GeoJSON 文件路径
        });

        // 添加图层来显示行政区划的边界
        map.addLayer({
            id: 'lineLayer',
            type: 'line',
            source: 'geojsonSource',
            paint: {
                'line-color': '#333',
                'line-width': 1.5
            }
        });
        //初始化上色
        paintMap();
        //绑定地图事件
        bindMapInteractions();

    });
}

// 根据value值上色
export function paintMap() {
    // 添加图层来上色
    map.addLayer({
        id: 'geojsonLayer',
        type: 'fill', // 根据你的数据类型设置合适的图层类型，比如 'fill'、'circle'、'line' 等
        source: 'geojsonSource',
        paint: {
            'fill-color': [
                'match',
                //在geojson中获取name属性
                ['get', 'name'],
                //将geojson中的name属性与cityValueData进行匹配，得到正确的综合得分，并根据colorRanges的情况上色
                ...ranking.reduce((acc, data) => {
                    return [...acc, data.cityName, getColor(data.score)];
                }, []),
                '#000000' // 默认颜色
            ],
            'fill-opacity': 0.7,// 填充透明度
        }
    });
}

// 切换数据更新地图上色
export function updateMap(value) {
    // 根据新的 value 更新绘制属性
    let propertiesSelect = '';
    switch (value) {
        case 0:
            propertiesSelect = '创新发展';
            break;
        case 1:
            propertiesSelect = '协调发展';
            break;
        case 2:
            propertiesSelect = '绿色发展';
            break;
        case 3:
            propertiesSelect = '开放发展';
            break;
        case 4:
            propertiesSelect = '共享发展';
            break;
        case 5:
            propertiesSelect = 'score';
            break;
        default:
            break;
    }
    map.setPaintProperty('geojsonLayer', 'fill-color', [
        'match',
        ['get', 'name'],
        ...ranking.reduce((acc, data) => {
            return [...acc, data.cityName, getColor(data[propertiesSelect])];
        }, []),
        '#000000' // 默认颜色
    ]);
    bindMapInteractions(value);
}

// 根据城市值获取对应颜色
function getColor(value) {
    if (value > 20) {
        for (const range of colorRanges) {
            if (value >= range.min && value <= range.max) {
                return range.color;
            }
        }
    } else {
        for (const range of colorRangesSingle) {
            if (value >= range.min && value <= range.max) {
                return range.color;
            }
        }
    }
    return '#000000'; // 默认颜色
}

// 悬浮地图上时，获取该城市的值
function getCityValue(cityName, value) {
    const cityData = ranking.find(data => data.cityName === cityName);
    switch (value) {
        case 0:
            return cityData ? cityData['创新发展'] : 'N/A';
        case 1:
            return cityData ? cityData['协调发展'] : 'N/A';
        case 2:
            return cityData ? cityData['绿色发展'] : 'N/A';
        case 3:
            return cityData ? cityData['开放发展'] : 'N/A';
        case 4:
            return cityData ? cityData['共享发展'] : 'N/A';
        case 5:
            return cityData ? cityData.score : 'N/A';
        default:
            return cityData ? cityData.score : 'N/A';
    }
}


// 在鼠标移动到地图上显示信息
let popup = null;

function showPopup(e, value) {
    const features = e.features;

    if (features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const cityName = features[0].properties.name; // 城市名称
        const cityValue = getCityValue(cityName, value); // 获取对应的值

        if (popup) {
            popup.remove();
        }

        // 在页面上显示浮动信息
        popup = new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${cityName}</strong><br>评分为: ${cityValue}`)
            .addTo(map);
    } else {
        map.getCanvas().style.cursor = '';
    }
}

// 在鼠标移出时移除浮动信息
function removePopup() {
    if (popup) {
        popup.remove();
    }
    map.getCanvas().style.cursor = '';
}

// 绑定地图交互事件，鼠标悬浮和移出事件
function bindMapInteractions(value) {
    map.off('mousemove', 'geojsonLayer', showPopup);
    map.on('mousemove', 'geojsonLayer', (e) => showPopup(e, value));

    map.off('mouseout', 'geojsonLayer', removePopup);
    map.on('mouseout', 'geojsonLayer', removePopup);
}